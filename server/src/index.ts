import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import type { OpencodeClient } from '@opencode-ai/sdk';
import { createOpencodeClient, createOpencodeServer } from '@opencode-ai/sdk';
import { reviewCode } from './ai.js';
import { rateLimit, globalRateLimit, anonymousSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from './middleware.js';
import { dailyQuota } from './daily-quota.js';
import { reviewRequestSchema } from './schemas.js';
import { logger, requestLogger } from './logger.js';
import { errorHandler, isLocalhost, logAndExit, timeout } from './utils.js';

const TIMEOUT = 30_000;

const PORT = Number(process.env.PORT ?? 4001);
const HOST = process.env.HOST ?? '0.0.0.0';
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'codelens-dev-secret-change-in-production';

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  logger.warn('SESSION_SECRET is not set. Using an insecure default in production!');
}

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
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});

const sessionMiddleware = session({
  secret: SESSION_SECRET,
  name: SESSION_COOKIE_NAME,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  },
});

function createApp(client: OpencodeClient) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '128kb' }));
  app.use(corsMiddleware);
  app.use(sessionMiddleware);
  app.use(requestLogger);
  app.use(anonymousSession);
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

    try {
      const review = await Promise.race([
        reviewCode(client, parsed.data.code),
        timeout(TIMEOUT),
      ]);
      res.json(review);
    } catch (error) {
      logger.error({ err: error }, 'Review request failed');
      const isTimeout = error instanceof Error && error.message === 'TIMEOUT';
      res.status(isTimeout ? 504 : 500).json({
        error: isTimeout
          ? 'Review timed out. Please try again.'
          : 'Review failed, try again!',
      });
    }
  });

  app.use(errorHandler);
  return app;
}

async function main() {
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
}

main().catch((error) => {
  logAndExit('Failed to start server', error);
});