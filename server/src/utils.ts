import { createHash } from 'node:crypto';
import type { ErrorRequestHandler, Request } from 'express';
import { logger } from './logger.js';

export const hashKey = (input: string) =>
  createHash('sha256').update(input).digest('hex');

export const ipKey = (req: Request) => hashKey(req.ip ?? 'unknown');

export const isLocalhost = (origin: string) => {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
};

const DEFAULT_MAX_ENTRIES = 100_000;

export interface TtlCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, expiresAt?: number): void;
  delete(key: string): boolean;
  readonly size: number;
  dispose(): void;
}

export const createTtlCache = <T>(
  ttlMs: number,
  maxEntries = DEFAULT_MAX_ENTRIES,
): TtlCache<T> => {
  const store = new Map<string, { value: T; expiresAt: number }>();
  let disposed = false;

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) store.delete(key);
    }
  }, ttlMs);
  timer.unref();

  const evictIfFull = () => {
    if (store.size < maxEntries) return;
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) {
        store.delete(key);
        if (store.size < maxEntries) return;
      }
    }
    while (store.size >= maxEntries) {
      const oldest = store.keys().next().value;
      if (oldest === undefined) break;
      store.delete(oldest);
    }
  };

  return {
    get: (key) => {
      if (disposed) return undefined;
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set: (key, value, expiresAt = Date.now() + ttlMs) => {
      if (disposed) return;
      if (!store.has(key)) evictIfFull();
      store.set(key, { value, expiresAt });
    },
    delete: (key) => (disposed ? false : store.delete(key)),
    get size() {
      return store.size;
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      clearInterval(timer);
      store.clear();
    },
  };
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;
  const { status, type } = error as { status?: number; type?: string };

  if (type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON in request body.' });
  } else if (status === 413) {
    res.status(413).json({ error: 'Request body too large.' });
  } else if (status !== undefined && status >= 400 && status < 500) {
    res.status(status).json({ error: 'Request could not be processed.' });
  } else {
    logger.error({ err: error }, 'Unhandled error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export const logAndExit = (message: string, error?: unknown, exitCode = 1): never => {
  logger.fatal({ err: error }, message);
  const detail = error instanceof Error ? `: ${error.message}` : '';
  process.stderr.write(`[FATAL] ${message}${detail}\n`);
  process.exit(exitCode);
};