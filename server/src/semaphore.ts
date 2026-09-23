import { AIAbortError } from './errors.js';

export interface Semaphore {
  acquire(signal?: AbortSignal): Promise<void>;
  release(): void;
}

export const createSemaphore = (max: number): Semaphore => {
  let active = 0;
  const waiting: Array<() => void> = [];

  return {
    acquire(signal) {
      if (signal?.aborted) return Promise.reject(new AIAbortError());
      if (active < max) {
        active += 1;
        return Promise.resolve();
      }
      return new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          const index = waiting.indexOf(wake);
          if (index !== -1) waiting.splice(index, 1);
          reject(new AIAbortError());
        };
        const wake = () => {
          signal?.removeEventListener('abort', onAbort);
          resolve();
        };
        waiting.push(wake);
        signal?.addEventListener('abort', onAbort, { once: true });
      });
    },
    release() {
      const next = waiting.shift();
      if (next) next();
      else active -= 1;
    },
  };
};