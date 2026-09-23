import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { reviewJsonShape, type Review } from '@code-lens-ai/shared';
import { reviewCode } from './ai.js';
import { createCostTracker, type CostTracker } from './cost.js';
import { createSemaphore, type Semaphore } from './semaphore.js';
import { createAsyncTtlCache, hashKey, type ResultCache } from './utils.js';
import { AIBudgetExceededError, AIOutputError, AIProviderError } from './errors.js';
import type { AIProvider, AIProviderResult } from './providers/types.js';

const sampleReview = (): Review => ({
  language: 'TypeScript',
  framework: 'None',
  score: 8,
  summary: 'Looks good.',
  issues: [
    { severity: 'low', category: 'style', line: 1, message: 'Minor nit.', suggestion: 'Ignore.' },
  ],
});

const framed = (review: Review) => `\`\`\`json\n${JSON.stringify(review)}\n\`\`\``;

class FakeProvider implements AIProvider {
  calls = 0;
  constructor(private readonly responses: Array<AIProviderResult | Error>) {}

  async prompt(): Promise<AIProviderResult> {
    const response = this.responses[Math.min(this.calls, this.responses.length - 1)];
    this.calls += 1;
    if (response instanceof Error) throw response;
    return response;
  }
}

const CODE = 'const value = 42;';

describe('reviewCode', () => {
  let cache: ResultCache<Review>;
  let budget: CostTracker;
  let semaphore: Semaphore;

  beforeEach(() => {
    cache = createAsyncTtlCache<Review>(60_000, 100);
    budget = createCostTracker(60_000, 10_000_000);
    semaphore = createSemaphore(2);
  });
  afterEach(async () => {
    await cache.dispose();
  });

  it('returns a parsed review from a valid response', async () => {
    const expected = sampleReview();
    const provider = new FakeProvider([{ text: framed(expected) }]);

    const result = await reviewCode(provider, { request: { code: CODE }, cache, budget, semaphore });

    expect(result.cached).toBe(false);
    expect(result.review).toEqual(expected);
    expect(provider.calls).toBe(1);
  });

  it('repairs invalid output by re-prompting once', async () => {
    const expected = sampleReview();
    const provider = new FakeProvider([{ text: 'not json at all' }, { text: framed(expected) }]);

    const result = await reviewCode(provider, { request: { code: CODE }, cache, budget, semaphore });

    expect(result.review).toEqual(expected);
    expect(provider.calls).toBe(2);
  });

  it('throws AIOutputError when output cannot be repaired', async () => {
    const provider = new FakeProvider([{ text: 'still not json' }, { text: 'still not json' }]);

    await expect(
      reviewCode(provider, { request: { code: CODE }, cache, budget, semaphore }),
    ).rejects.toThrow(AIOutputError);
    expect(provider.calls).toBe(2);
  });

  it('serves cached reviews without calling the provider', async () => {
    const expected = sampleReview();
    await cache.set(hashKey(`${CODE}::${reviewJsonShape}`), expected);
    const provider = new FakeProvider([{ text: framed(expected) }]);

    const result = await reviewCode(provider, { request: { code: CODE }, cache, budget, semaphore });

    expect(result.cached).toBe(true);
    expect(result.review).toEqual(expected);
    expect(provider.calls).toBe(0);
  });

  it('rejects the review when the budget is exhausted', async () => {
    const provider = new FakeProvider([{ text: framed(sampleReview()) }]);
    const exhausted = createCostTracker(60_000, 1);

    await expect(
      reviewCode(provider, { request: { code: CODE }, cache, budget: exhausted, semaphore }),
    ).rejects.toThrow(AIBudgetExceededError);
    expect(provider.calls).toBe(0);
  });

  it('retries a failed provider call before giving up', async () => {
    const expected = sampleReview();
    const provider = new FakeProvider([new AIProviderError('boom'), { text: framed(expected) }]);

    const result = await reviewCode(provider, { request: { code: CODE }, cache, budget, semaphore });

    expect(result.review).toEqual(expected);
    expect(provider.calls).toBe(2);
  });

  it('rejects when every provider attempt fails', async () => {
    const provider = new FakeProvider([new AIProviderError('boom'), new AIProviderError('boom harder')]);

    await expect(
      reviewCode(provider, { request: { code: CODE }, cache, budget, semaphore }),
    ).rejects.toThrow('boom harder');
    expect(provider.calls).toBe(3);
  });
});