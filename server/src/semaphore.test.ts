import { describe, expect, it } from 'vitest';
import { createSemaphore } from './semaphore.js';

describe('semaphore', () => {
  it('never lets more than max tasks run at once', async () => {
    const semaphore = createSemaphore(2);
    let active = 0;
    let peak = 0;

    const tasks = Array.from({ length: 20 }, async () => {
      await semaphore.acquire();
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      semaphore.release();
    });
    await Promise.all(tasks);

    expect(peak).toBe(2);
    expect(active).toBe(0);
  });

  it('releases waiters in FIFO order', async () => {
    const semaphore = createSemaphore(1);
    await semaphore.acquire();
    const order: string[] = [];

    const first = semaphore.acquire().then(() => {
      order.push('first');
      semaphore.release();
    });
    const second = semaphore.acquire().then(() => {
      order.push('second');
      semaphore.release();
    });

    semaphore.release();
    await Promise.all([first, second]);

    expect(order).toEqual(['first', 'second']);
  });

  it('allows a new acquire after release when no one is waiting', async () => {
    const semaphore = createSemaphore(1);
    await semaphore.acquire();
    semaphore.release();
    await semaphore.acquire();
    semaphore.release();
  });
});