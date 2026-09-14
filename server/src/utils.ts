import { createHash } from 'node:crypto';
import type { ErrorRequestHandler } from 'express';
import { logger } from './logger.js';

export const hashKey = (input: string) =>
  createHash('sha256').update(input).digest('hex');

export const isLocalhost = (origin: string) => {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

export interface ExpiringEntry {
  count: number;
  resetAt: number;
}

export function createExpiringStore(sweepIntervalMs: number) {
  const store = new Map<string, ExpiringEntry>();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, sweepIntervalMs);
  timer.unref();
  return store;
}

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

export function logAndExit(message: string, error?: unknown, exitCode = 1): never {
  logger.fatal({ err: error }, message);
  const detail = error instanceof Error ? `: ${error.message}` : '';
  process.stderr.write(`[FATAL] ${message}${detail}\n`);
  process.exit(exitCode);
}

export const timeout = (ms: number) =>
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), ms),
  );