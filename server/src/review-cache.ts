import { createHash } from 'node:crypto';
import type { Review } from './schemas.js';

const DEFAULT_MAX_ENTRIES = 1_000;
const DEFAULT_TTL_MS = 60 * 60 * 1_000; // 1 hour

interface CacheEntry {
  review: Review;
  expiresAt: number;
}

export class ReviewCache {
  private store = new Map<string, CacheEntry>();
  private timer: ReturnType<typeof setInterval>;

  constructor(
    private ttlMs = DEFAULT_TTL_MS,
    private maxEntries = DEFAULT_MAX_ENTRIES,
  ) {
    this.timer = setInterval(() => this.sweep(), this.ttlMs);
    this.timer.unref();
  }

  static key(code: string): string {
    return createHash('sha256').update(code.trim()).digest('hex');
  }

  get(code: string): Review | undefined {
    const entry = this.store.get(ReviewCache.key(code));
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(ReviewCache.key(code));
      return undefined;
    }
    return entry.review;
  }

  set(code: string, review: Review): void {
    if (this.store.size >= this.maxEntries) this.evictOldest();
    this.store.set(ReviewCache.key(code), {
      review,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  get size(): number {
    return this.store.size;
  }

  dispose(): void {
    clearInterval(this.timer);
    this.store.clear();
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  private evictOldest(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        return;
      }
    }
    const oldest = this.store.keys().next().value;
    if (oldest) this.store.delete(oldest);
  }
}
