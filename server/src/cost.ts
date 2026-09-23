export interface CostTracker {
  record(usage: { inputTokens: number; outputTokens: number }): void;
  remaining(): number;
}

export const createCostTracker = (windowMs: number, maxTokens: number): CostTracker => {
  const events: Array<{ at: number; tokens: number }> = [];

  return {
    record({ inputTokens, outputTokens }) {
      events.push({ at: Date.now(), tokens: inputTokens + outputTokens });
    },
    remaining() {
      const now = Date.now();
      while (events.length > 0 && now - events[0].at > windowMs) events.shift();
      const total = events.reduce((sum, event) => sum + event.tokens, 0);
      return maxTokens - total;
    },
  };
};