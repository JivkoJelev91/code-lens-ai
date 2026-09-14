import { createHash, randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

const store = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

const bucketKey = (ip: string | undefined) =>
  ip ? createHash('sha256').update(ip).digest('hex') : randomUUID();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = bucketKey(req.ip);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else if (entry.count >= RATE_LIMIT_MAX) {
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  } else {
    entry.count++;
  }

  next();
}