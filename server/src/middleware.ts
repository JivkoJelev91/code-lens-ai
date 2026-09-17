import type { NextFunction, Request, Response } from 'express';
import { createTtlCache, ipKey, type TtlCache } from './utils.js';

interface LimiterConfig {
  store: TtlCache<{ count: number; resetAt: number }>;
  max: number;
  headerPrefix: 'RateLimit' | 'DailyQuota';
  message: string;
  resetAtFor: (now: number) => number;
}

export const createLimiter = ({
  store,
  max,
  headerPrefix,
  message,
  resetAtFor,
}: LimiterConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    let bucket = store.get(ipKey(req));

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = resetAtFor(now);
      bucket = { count: 0, resetAt };
      store.set(ipKey(req), bucket, resetAt);
    }

    bucket.count++;

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader(`X-${headerPrefix}-Limit`, max);
    res.setHeader(`X-${headerPrefix}-Remaining`, remaining);
    res.setHeader(`X-${headerPrefix}-Reset`, Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({ error: message });
      return;
    }
    next();
  };
};

export const createWindowLimiter = (max: number, windowMs: number, message: string) =>
  createLimiter({
    store: createTtlCache(windowMs),
    max,
    headerPrefix: 'RateLimit',
    message,
    resetAtFor: (now) => now + windowMs,
  });

export const globalRateLimit = createWindowLimiter(
  60,
  60_000,
  'Too many requests. Please try again later.',
);

export const rateLimit = createWindowLimiter(
  10,
  60_000,
  'Too many requests on the review endpoint. Please try again later.',
);