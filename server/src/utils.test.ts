import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAsyncTtlCache, hashKey, isLocalhost, type ResultCache } from './utils.js';

describe('hashKey', () => {
  it('is stable for the same input', () => {
    expect(hashKey('const a = 1')).toBe(hashKey('const a = 1'));
  });

  it('differs for different inputs and is 64 hex chars', () => {
    const a = hashKey('abc');
    const b = hashKey('abd');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('isLocalhost', () => {
  it('accepts localhost origins', () => {
    expect(isLocalhost('http://localhost:5173')).toBe(true);
    expect(isLocalhost('http://127.0.0.1:4001')).toBe(true);
  });

  it('rejects external and malformed origins', () => {
    expect(isLocalhost('http://example.com')).toBe(false);
    expect(isLocalhost('not a url')).toBe(false);
  });
});

describe('createAsyncTtlCache', () => {
  const TTL_MS = 60_000;

  let cache: ResultCache<number>;
  beforeEach(() => {
    cache = createAsyncTtlCache<number>(TTL_MS, 10);
  });
  afterEach(async () => {
    await cache.dispose();
  });

  it('stores and returns values', async () => {
    await cache.set('a', 1);
    const value = await cache.get('a');
    expect.assert(value);
    expect(value).toBe(1);
  });

  it('returns undefined for missing keys', async () => {
    expect(await cache.get('missing')).toBeUndefined();
  });

  describe('ttl', () => {
    let shortCache: ResultCache<number>;
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(0);
      shortCache = createAsyncTtlCache<number>(100, 2);
    });
    afterEach(async () => {
      await shortCache.dispose();
      vi.useRealTimers();
    });

    it('expires entries after the ttl', async () => {
      await shortCache.set('a', 1);
      expect(await shortCache.get('a')).toBe(1);

      vi.setSystemTime(101);
      expect(await shortCache.get('a')).toBeUndefined();
    });

    it('evicts the oldest entry when full', async () => {
      await shortCache.set('a', 1);
      await shortCache.set('b', 2);
      await shortCache.set('c', 3);

      expect(await shortCache.get('a')).toBeUndefined();
      expect(await shortCache.get('b')).toBe(2);
      expect(await shortCache.get('c')).toBe(3);
    });
  });
});