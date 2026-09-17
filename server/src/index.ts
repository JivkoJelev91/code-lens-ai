import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import type { OpencodeClient } from '@opencode-ai/sdk';
import { createOpencodeClient, createOpencodeServer } from '@opencode-ai/sdk';
import type { Review } from '@code-lens-ai/shared';
import { reviewRequestSchema } from '@code-lens-ai/shared';
import { reviewCode } from './ai.js';
import { rateLimit, globalRateLimit } from './middleware.js';
import { dailyQuota } from './daily-quota.js';
import { logger, requestLogger } from './logger.js';
import { createTtlCache, errorHandler, isLocalhost, logAndExit, type TtlCache } from './utils.js';

const STARTUP_TIMEOUT_MS = 60_000;
const REVIEW_TIMEOUT_MS = Number(process.env.REVIEW_TIMEOUT_MS ?? 120_000);
if (!Number.isFinite(REVIEW_TIMEOUT_MS) || REVIEW_TIMEOUT_MS < 1_000 || REVIEW_TIMEOUT_MS > 600_000) {
  logAndExit(`Invalid REVIEW_TIMEOUT_MS: ${process.env.REVIEW_TIMEOUT_MS}`);
}

const REVIEW_CACHE_TTL_MS = 60 * 60 * 1_000;
const REVIEW_CACHE_MAX_ENTRIES = 1_000;

const port = Number(process.env.PORT ?? 4001);
if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
  logAndExit(`Invalid PORT: ${process.env.PORT}`);
}
const PORT = port;
const HOST = process.env.HOST ?? '0.0.0.0';

const defaultAllowedOrigins = new Set(
  (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const isProd = process.env.NODE_ENV === 'production';

// Requests without an Origin header (curl, server-to-server) pass through; CORS is enforced by the browser, not this middleware.
const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) return callback(null, false);
    if (defaultAllowedOrigins.has(origin)) return callback(null, true);
    if (!isProd && isLocalhost(origin)) return callback(null, true);
    const err = new Error('Not allowed by CORS') as Error & { status?: number };
    err.status = 403;
    callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Cache'],
  maxAge: 86_400,
});

const createApp = (client: OpencodeClient, cache: TtlCache<Review>) => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '128kb' }));
  app.use(corsMiddleware);
  app.use(requestLogger);
  app.use(globalRateLimit);

  app.get('/', (_req, res) => {
    res.json({ message: 'CodeLens AI server is running.' });
  });

  app.post('/api/review', rateLimit, dailyQuota, async (req, res) => {
    const parsed = reviewRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REVIEW_TIMEOUT_MS);
    try {
      const { review, cached } = await reviewCode(client, {
        code: parsed.data.code,
        cache,
        signal: controller.signal,
      });
      res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
      res.json(review);
    } catch (error) {
      const isTimeout = controller.signal.aborted;
      logger.error({ err: error }, 'Review request failed');
      res.status(isTimeout ? 504 : 500).json({
        error: isTimeout
          ? 'Review timed out. Please try again.'
          : 'Review failed, try again!',
      });
    } finally {
      clearTimeout(timer);
    }
  });

  app.use(errorHandler);
  return app;
};

const main = async () => {
  const opencode = await createOpencodeServer({ timeout: STARTUP_TIMEOUT_MS, port: 0 });
  const client = createOpencodeClient({ baseUrl: opencode.url });
  const cache: TtlCache<Review> = createTtlCache<Review>(REVIEW_CACHE_TTL_MS, REVIEW_CACHE_MAX_ENTRIES);
  const app = createApp(client, cache);

  app.listen(PORT, HOST, () => {
    logger.info({ host: HOST, port: PORT }, 'Server listening');
  });

  const shutdown = () => {
    logger.info('Shutting down server');
    cache.dispose();
    opencode.close();
    process.exit(0);
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, shutdown);
  }
  process.on('uncaughtException', (error) => {
    try { opencode.close(); } catch { /* ignore */ }
    logAndExit('Uncaught exception', error);
  });
  process.on('unhandledRejection', (reason) => {
    try { opencode.close(); } catch { /* ignore */ }
    logAndExit('Unhandled rejection', reason);
  });
};

main().catch((error) => {
  logAndExit('Failed to start server', error);
});