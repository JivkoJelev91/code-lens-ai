import { Redis } from 'ioredis';
import { getRequestLogger } from './logger.js';
import type { ResultCache } from './utils.js';

export const createRedisCache = <T>(url: string, ttlMs: number): ResultCache<T> => {
  const client = new Redis(url, {
    connectTimeout: 5_000,
    commandTimeout: 5_000,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 50, 2_000),
  });
  client.on('error', (err) => {
    getRequestLogger().warn({ err }, 'Redis cache client error');
  });

  return {
    async get(key) {
      try {
        const raw = await client.get(key);
        if (raw == null) return undefined;
        return JSON.parse(raw) as T;
      } catch (err) {
        getRequestLogger().warn({ err }, 'Redis cache get failed');
        return undefined;
      }
    },
    async set(key, value, expiresAt = Date.now() + ttlMs) {
      try {
        await client.set(key, JSON.stringify(value), 'PX', Math.max(1, expiresAt - Date.now()));
      } catch (err) {
        getRequestLogger().warn({ err }, 'Redis cache set failed');
      }
    },
    async dispose() {
      await client.quit();
    },
  };
};