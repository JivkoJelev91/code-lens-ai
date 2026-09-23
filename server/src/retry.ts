import { AIAbortError, AppError } from './errors.js';

export interface RetryOptions {
  attempts: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
  onRetry?: (error: unknown, retryCount: number) => void;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AIAbortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AIAbortError());
    };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });

export const retriable = async <T>(
  fn: () => Promise<T>,
  { attempts, baseDelayMs = 250, maxDelayMs = 2_000, signal, onRetry }: RetryOptions,
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRetriable = error instanceof AppError && error.retriable;
      const hasAttemptsLeft = attempt + 1 < attempts;
      if (!isRetriable || !hasAttemptsLeft) throw error;

      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jittered = delay * (0.5 + Math.random() * 0.5);
      onRetry?.(error, attempt + 1);
      await sleep(jittered, signal);
    }
  }
  throw lastError;
};