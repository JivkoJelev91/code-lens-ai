import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { createExpiringStore, hashKey, type ExpiringEntry } from './utils.js';

// --- Rate Limiting ---

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

const rateLimitStore: Map<string, ExpiringEntry> =
  createExpiringStore(RATE_LIMIT_WINDOW_MS);

function rateLimitFor(
  store: Map<string, ExpiringEntry>,
  max: number,
  windowMs: number,
  message: string,
) {
  const requesterId = (req: Request) =>
    `${req.ip ?? 'unknown'}:${req.sessionId ?? 'nosession'}`;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = hashKey(requesterId(req));
    const now = Date.now();
    const entry = store.get(key);

    let count: number;
    let resetAt: number;

    if (!entry || entry.resetAt <= now) {
      count = 1;
      resetAt = now + windowMs;
      store.set(key, { count, resetAt });
    } else if (entry.count >= max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));
      res.status(429).json({ error: message });
      return;
    } else {
      entry.count++;
      count = entry.count;
      resetAt = entry.resetAt;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));

    next();
  };
}

const GLOBAL_RATE_LIMIT_MAX = 60;
const GLOBAL_RATE_LIMIT_WINDOW_MS = 60_000;

const globalStore: Map<string, ExpiringEntry> =
  createExpiringStore(GLOBAL_RATE_LIMIT_WINDOW_MS);

export const globalRateLimit = rateLimitFor(
  globalStore,
  GLOBAL_RATE_LIMIT_MAX,
  GLOBAL_RATE_LIMIT_WINDOW_MS,
  'Too many requests. Please try again later.',
);

export const rateLimit = rateLimitFor(
  rateLimitStore,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  'Too many requests on the review endpoint. Please try again later.',
);

// --- Anonymous Session ---

const SESSION_COOKIE_NAME = 'codelens.sid';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const anonymousSession: RequestHandler = async (req, _res, next) => {
  if (!req.session?.id) {
    await new Promise<void>((resolve, reject) => {
      req.session!.regenerate((err) => (err ? reject(err) : resolve()));
    });
  }
  req.sessionId = req.session.id;
  next();
};

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS };