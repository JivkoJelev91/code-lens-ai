import type { NextFunction, Request, Response } from 'express';
import { createExpiringStore, hashKey, type ExpiringStore } from './utils.js';

const DAILY_QUOTA_MAX = 100;
const CLEANUP_INTERVAL_MS = 60_000;

const store: ExpiringStore = createExpiringStore(CLEANUP_INTERVAL_MS);

const nextMidnightUtcMs = () => {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  ));
  return next.getTime();
};

export const dailyQuota = (req: Request, res: Response, next: NextFunction) => {
  const key = hashKey(req.ip ?? 'unknown');

  const now = Date.now();
  let bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = nextMidnightUtcMs();
    bucket = { count: 0, resetAt };
    store.set(key, bucket);
  }

  bucket.count++;

  res.setHeader('X-DailyQuota-Limit', DAILY_QUOTA_MAX);
  res.setHeader('X-DailyQuota-Remaining', Math.max(0, DAILY_QUOTA_MAX - bucket.count));
  res.setHeader('X-DailyQuota-Reset', Math.ceil(bucket.resetAt / 1000));

  if (bucket.count > DAILY_QUOTA_MAX) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfterSec);
    res.status(429).json({ error: 'Daily quota exceeded. Try again tomorrow.' });
    return;
  }

  next();
};
