import { reviewSchema, reviewJsonShape, type Review, type ReviewRequest } from '@code-lens-ai/shared';
import { hashKey, type TtlCache } from './utils.js';
import { logger } from './logger.js';
import type { AIProvider } from './providers/types.js';
import { AIBudgetExceededError, AIOutputError } from './errors.js';
import { retriable } from './retry.js';
import type { CostTracker } from './cost.js';
import { buildReviewPrompt, getSkill } from './prompts.js';

export interface ReviewResult {
  review: Review;
  cached: boolean;
}

const MAX_REPAIR_ATTEMPTS = 1;
const PROVIDER_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 2_000;

export interface ReviewCodeOptions {
  request: ReviewRequest;
  cache: TtlCache<Review>;
  budget: CostTracker;
  signal?: AbortSignal;
}

const parseReviewText = (text: string): { review: Review } | { feedback: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      text.trim().replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, ''),
    );
  } catch {
    return { feedback: 'Response was not valid JSON.' };
  }
  const result = reviewSchema.safeParse(parsed);
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ');
    logger.error({ err: result.error }, 'AI response validation failed');
    return { feedback: detail };
  }
  return { review: result.data };
};

export const reviewCode = async (
  provider: AIProvider,
  { request, cache, budget, signal }: ReviewCodeOptions,
): Promise<ReviewResult> => {
  const cacheKey = hashKey(`${request.code}::${reviewJsonShape}`);
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.info({ cache: 'hit' }, 'Review served from cache');
    return { review: cached, cached: true };
  }
  logger.info({ cache: 'miss' }, 'Review not cached');

  const skillContent = await getSkill();

  let feedback: string | undefined;
  let review: Review | undefined;
  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    const attemptPrompt = buildReviewPrompt(skillContent, request.code, feedback);
    const text = await retriable(
      async () => {
        if (budget.remaining() <= 0) throw new AIBudgetExceededError();
        const { text: raw, usage } = await provider.prompt(attemptPrompt, { signal });
        if (usage) {
          budget.record(usage);
          logger.info({ usage }, 'AI token usage recorded');
        }
        return raw;
      },
      {
        attempts: PROVIDER_MAX_ATTEMPTS,
        baseDelayMs: RETRY_BASE_DELAY_MS,
        maxDelayMs: RETRY_MAX_DELAY_MS,
        signal,
        onRetry: (_error, retryCount) =>
          logger.warn({ retryCount }, 'AI provider call failed, retrying'),
      },
    );
    const parsed = parseReviewText(text);
    if ('review' in parsed) {
      review = parsed.review;
      break;
    }
    feedback = parsed.feedback;
    logger.warn({ attempt }, 'AI response invalid, re-prompting to repair');
  }

  if (!review) {
    logger.error({ feedback }, 'AI output could not be repaired');
    throw new AIOutputError();
  }
  cache.set(cacheKey, review);
  return { review, cached: false };
};
