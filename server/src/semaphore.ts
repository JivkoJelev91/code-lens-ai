export interface Semaphore {
  acquire(): Promise<void>;
  release(): void;
}

export const createSemaphore = (max: number): Semaphore => {
  let active = 0;
  const waiting: Array<() => void> = [];

  return {
    acquire() {
      if (active < max) {
        active += 1;
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        waiting.push(resolve);
      });
    },
    release() {
      const next = waiting.shift();
      if (next) next();
      else active -= 1;
    },
  };
};