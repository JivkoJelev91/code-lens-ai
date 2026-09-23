import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCostTracker } from './cost.js';

const WINDOW_MS = 1_000;
const MAX_TOKENS = 1_000;

describe('cost tracker', () => {
  it('rejects a reservation that would exceed the budget', () => {
    const budget = createCostTracker(WINDOW_MS, MAX_TOKENS);
    expect(budget.reserve(600)).toBe(true);
    expect(budget.reserve(500)).toBe(false);
    expect(budget.remaining()).toBe(400);
  });

  it('restores capacity after refund', () => {
    const budget = createCostTracker(WINDOW_MS, MAX_TOKENS);
    budget.reserve(600);
    budget.refund(600);
    expect(budget.reserve(1_000)).toBe(true);
  });

  it('counts recorded usage against the budget', () => {
    const budget = createCostTracker(WINDOW_MS, MAX_TOKENS);
    budget.record(400, 200);
    expect(budget.remaining()).toBe(400);
  });

  describe('window expiry', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('drops recorded usage once the window passes', () => {
      vi.setSystemTime(0);
      const budget = createCostTracker(WINDOW_MS, MAX_TOKENS);
      budget.record(900, 0);
      expect(budget.remaining()).toBe(100);

      vi.setSystemTime(WINDOW_MS + 1);
      expect(budget.remaining()).toBe(1_000);
    });
  });
});