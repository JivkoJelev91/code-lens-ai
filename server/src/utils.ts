import { createHash } from 'node:crypto';
import type { ErrorRequestHandler } from 'express';
import { logger } from './logger.js';

export const hashKey = (input: string) =>
  createHash('sha256').update(input).digest('hex');

export const isLocalhost = (origin: string) => {
  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    return hostname === '[::1]' || hostname === '::1';
  } catch {
    return false;
  }
};

export interface ExpiringEntry {
  count: number;
  resetAt: number;
}

export interface ExpiringStore {
  get(key: string): ExpiringEntry | undefined;
  set(key: string, entry: ExpiringEntry): void;
  delete(key: string): boolean;
  readonly size: number;
  dispose(): void;
}

const DEFAULT_MAX_ENTRIES = 100_000;

export const createExpiringStore = (
  sweepIntervalMs: number,
  maxEntries = DEFAULT_MAX_ENTRIES,
): ExpiringStore => {
  const store = new Map<string, ExpiringEntry>();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, sweepIntervalMs);
  timer.unref();

  let disposed = false;

  const evictIfFull = () => {
    if (store.size < maxEntries) return;
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
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
      if (entry && entry.resetAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry;
    },
    set: (key, entry) => {
      if (disposed) return;
      evictIfFull();
      store.set(key, entry);
    },
    delete: (key) => {
      if (disposed) return false;
      return store.delete(key);
    },
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
