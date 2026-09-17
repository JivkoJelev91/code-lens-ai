import { createLimiter } from './middleware.js';
import { createTtlCache } from './utils.js';

const DAILY_QUOTA_MAX = 100;
const CLEANUP_INTERVAL_MS = 60_000;

const nextMidnightUtcMs = (now = Date.now()) => {
  const date = new Date(now);
  const next = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
    0, 0, 0, 0,
  ));
  return next.getTime();
};

export const dailyQuota = createLimiter({
  store: createTtlCache(CLEANUP_INTERVAL_MS),
  max: DAILY_QUOTA_MAX,
  headerPrefix: 'DailyQuota',
  message: 'Daily quota exceeded. Try again tomorrow.',
  resetAtFor: (now) => nextMidnightUtcMs(now),
});