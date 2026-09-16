import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import type { OpencodeClient } from '@opencode-ai/sdk';
import { createOpencodeClient, createOpencodeServer } from '@opencode-ai/sdk';
import { reviewCode } from './ai.js';
import { rateLimit, globalRateLimit } from './middleware.js';
import { dailyQuota } from './daily-quota.js';
import { reviewRequestSchema } from './schemas.js';
import { logger, requestLogger } from './logger.js';
import { errorHandler, isLocalhost, logAndExit } from './utils.js';

const TIMEOUT = 30_000;

const port = Number(process.env.PORT ?? 4001);
if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
  logAndExit(`Invalid PORT: ${process.env.PORT}`);
}
const PORT = port;
const HOST = process.env.HOST ?? '0.0.0.0';

const defaultAllowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) return callback(null, false);
    if (defaultAllowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && isLocalhost(origin)) {
      return callback(null, true);
    }
    callback(Object.assign(new Error('Not allowed by CORS'), { status: 403 }));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});

const createApp = (client: OpencodeClient) => {
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
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const review = await reviewCode(client, parsed.data.code, controller.signal);
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
  const opencode = await createOpencodeServer({ timeout: TIMEOUT, port: 0 });
  const client = createOpencodeClient({ baseUrl: opencode.url });
  const app = createApp(client);

  app.listen(PORT, HOST, () => {
    logger.info({ host: HOST, port: PORT }, 'Server listening');
  });

  const shutdown = () => {
    logger.info('Shutting down server');
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