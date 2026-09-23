import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createOpencodeClient, createOpencodeServer } from '@opencode-ai/sdk';
import type { Review } from '@code-lens-ai/shared';
import { globalRateLimit } from './middleware.js';
import { logger, requestLogger, getRequestLogger } from './logger.js';
import { createAsyncTtlCache, errorHandler, isLocalhost, logAndExit, type ResultCache } from './utils.js';
import { createRedisCache } from './redis-cache.js';
import { reviewRouter } from './routes/review.js';
import { OpencodeAIProvider } from './providers/opencode.js';
import type { AIProvider } from './providers/types.js';
import { createCostTracker } from './cost.js';
import type { CostTracker } from './cost.js';
import { createSemaphore } from './semaphore.js';
import type { Semaphore } from './semaphore.js';

const STARTUP_TIMEOUT_MS = 60_000;
const REVIEW_CACHE_TTL_MS = 60 * 60 * 1_000;
const REVIEW_CACHE_MAX_ENTRIES = 1_000;

const REDIS_URL = process.env.REDIS_URL ?? '';

const AI_MAX_CONCURRENCY = Number(process.env.AI_MAX_CONCURRENCY ?? 4);
if (!Number.isInteger(AI_MAX_CONCURRENCY) || AI_MAX_CONCURRENCY < 1) {
  logAndExit(`Invalid AI_MAX_CONCURRENCY: ${process.env.AI_MAX_CONCURRENCY}`);
}

const AI_BUDGET_WINDOW_MS = 60 * 60 * 1_000;
const AI_BUDGET_MAX_TOKENS = Number(process.env.AI_BUDGET_TOKENS_PER_HOUR ?? 200_000);
if (!Number.isFinite(AI_BUDGET_MAX_TOKENS) || AI_BUDGET_MAX_TOKENS < 1) {
  logAndExit(`Invalid AI_BUDGET_TOKENS_PER_HOUR: ${process.env.AI_BUDGET_TOKENS_PER_HOUR}`);
}

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

const createApp = (
  provider: AIProvider,
  cache: ResultCache<Review>,
  budget: CostTracker,
  semaphore: Semaphore,
) => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '128kb' }));
  app.use(corsMiddleware);
  app.get('/health/live', (_req, res) => {
    res.json({ status: 'live' });
  });
  app.get('/health/ready', async (_req, res) => {
    try {
      await cache.ping();
      res.json({ status: 'ready' });
    } catch (error) {
      getRequestLogger().warn({ err: error }, 'Readiness check failed');
      res.status(503).json({ status: 'not_ready' });
    }
  });
  app.use(requestLogger);
  app.use(globalRateLimit);
  app.get('/', (_req, res) => {
    res.json({ message: 'CodeLens AI server is running.' });
  });
  app.use('/api', reviewRouter(provider, cache, budget, semaphore));
  app.use(errorHandler);
  return app;
};

const main = async () => {
  const opencode = await createOpencodeServer({ timeout: STARTUP_TIMEOUT_MS, port: 0 });
  const client = createOpencodeClient({ baseUrl: opencode.url });
  const provider = new OpencodeAIProvider(client);
  const cache: ResultCache<Review> = REDIS_URL
    ? createRedisCache<Review>(REDIS_URL, REVIEW_CACHE_TTL_MS)
    : createAsyncTtlCache<Review>(REVIEW_CACHE_TTL_MS, REVIEW_CACHE_MAX_ENTRIES);
  const budget: CostTracker = createCostTracker(AI_BUDGET_WINDOW_MS, AI_BUDGET_MAX_TOKENS);
  const semaphore: Semaphore = createSemaphore(AI_MAX_CONCURRENCY);
  const app = createApp(provider, cache, budget, semaphore);

  const server = app.listen(PORT, HOST, () => {
    logger.info(
      {
        nodeEnv: process.env.NODE_ENV ?? 'development',
        host: HOST,
        port: PORT,
        aiMaxConcurrency: AI_MAX_CONCURRENCY,
        aiBudgetMaxTokens: AI_BUDGET_MAX_TOKENS,
        aiBudgetWindowMs: AI_BUDGET_WINDOW_MS,
        cacheMode: REDIS_URL ? 'redis' : 'memory',
      },
      'Server listening',
    );
  });

  const shutdown = async () => {
    logger.info('Shutting down server');
    const forceExit = setTimeout(() => {
      logger.warn('Shutdown timed out, forcing exit');
      process.exit(1);
    }, 5_000);
    forceExit.unref();

    server.close();
    server.closeAllConnections();
    try {
      await cache.dispose();
    } catch (err) {
      logger.warn({ err }, 'Cache dispose failed');
    }
    opencode.close();
    clearTimeout(forceExit);
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