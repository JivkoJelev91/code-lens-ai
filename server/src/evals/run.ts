import { createOpencodeClient, createOpencodeServer } from '@opencode-ai/sdk';
import type { Review } from '@code-lens-ai/shared';
import { reviewCode } from '../ai.js';
import { OpencodeAIProvider } from '../providers/opencode.js';
import type { AIProvider } from '../providers/types.js';
import { createCostTracker } from '../cost.js';
import { createSemaphore } from '../semaphore.js';
import { createAsyncTtlCache } from '../utils.js';
import { logger } from '../logger.js';
import { CASES, type EvalCase } from './cases.js';

const STARTUP_TIMEOUT_MS = 60_000;
const CASE_TIMEOUT_MS = 120_000;
const EVAL_MAX_CONCURRENCY = 2;
const EVAL_BUDGET_TOKENS = 500_000;

interface RunResult {
  name: string;
  passed: boolean;
  detail: string;
}

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const checkExpectation = (review: Review, expect: EvalCase['expect']): string[] => {
  const failures: string[] = [];
  const text = normalize(
    [
      review.summary,
      ...review.issues.map((issue) => `${issue.message} ${issue.suggestion} ${issue.category}`),
    ].join(' '),
  );
  for (const needle of expect.mustFind ?? []) {
    if (!text.includes(normalize(needle))) {
      failures.push(`expected to mention "${needle}"`);
    }
  }
  if (expect.minIssues !== undefined && review.issues.length < expect.minIssues) {
    failures.push(`expected at least ${expect.minIssues} issue(s), got ${review.issues.length}`);
  }
  if (expect.maxIssues !== undefined && review.issues.length > expect.maxIssues) {
    failures.push(`expected at most ${expect.maxIssues} issue(s), got ${review.issues.length}`);
  }
  if (expect.minScore !== undefined && review.score < expect.minScore) {
    failures.push(`expected score >= ${expect.minScore}, got ${review.score}`);
  }
  return failures;
};

const runCase = async (provider: AIProvider, evalCase: EvalCase, signal: AbortSignal): Promise<RunResult> => {
  const cache = createAsyncTtlCache<Review>(CASE_TIMEOUT_MS, 50);
  try {
    let review: Review;
    try {
      const result = await reviewCode(provider, {
        request: { code: evalCase.code },
        cache,
        budget: createCostTracker(CASE_TIMEOUT_MS, EVAL_BUDGET_TOKENS),
        semaphore: createSemaphore(EVAL_MAX_CONCURRENCY),
        signal,
      });
      review = result.review;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { name: evalCase.name, passed: false, detail: `error: ${message}` };
    }
    const failures = checkExpectation(review, evalCase.expect);
    const detail = `score ${review.score}, ${review.issues.length} issue(s)` +
      (failures.length > 0 ? ` - ${failures.join('; ')}` : '');
    return { name: evalCase.name, passed: failures.length === 0, detail };
  } finally {
    await cache.dispose();
  }
};

const main = async () => {
  logger.level = process.env.LOG_LEVEL ?? 'warn';
  const opencode = await createOpencodeServer({ timeout: STARTUP_TIMEOUT_MS, port: 0 });
  const provider = new OpencodeAIProvider(createOpencodeClient({ baseUrl: opencode.url }));

  const results: RunResult[] = [];
  try {
    for (const evalCase of CASES) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CASE_TIMEOUT_MS);
      results.push(await runCase(provider, evalCase, controller.signal));
      clearTimeout(timer);
    }
  } finally {
    opencode.close();
  }

  const passed = results.filter((r) => r.passed).length;
  const errors = results.filter((r) => r.detail.startsWith('error:')).length;

  for (const result of results) {
    console.log(`${result.passed ? 'PASS' : 'FAIL'}  ${result.name}  ${result.detail}`);
  }
  const countPassed = (predicate: (c: EvalCase) => boolean) => {
    const cases = CASES.filter(predicate);
    const ok = cases.filter((c) => results.find((r) => r.name === c.name)?.passed).length;
    return `${ok}/${cases.length}`;
  };
  console.log('');
  console.log(`Cases: ${passed}/${CASES.length} passed`);
  console.log(`Detection (must-find): ${countPassed((c) => (c.expect.mustFind?.length ?? 0) > 0)}`);
  console.log(`Clean code respected: ${countPassed((c) => c.expect.maxIssues !== undefined)}`);
  console.log(`Errors: ${errors}`);

  process.exitCode = passed === CASES.length ? 0 : 1;
};

main().catch((error) => {
  console.error('Eval run failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});