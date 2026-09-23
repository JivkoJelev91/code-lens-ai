export interface CostTracker {
  remaining(): number;
  reserve(tokens: number): boolean;
  refund(tokens: number): void;
  record(inputTokens: number, outputTokens: number): void;
}

export const createCostTracker = (windowMs: number, maxTokens: number): CostTracker => {
  const events: Array<{ at: number; tokens: number }> = [];
  let reserved = 0;

  const pruneExpired = () => {
    const now = Date.now();
    while (events.length > 0 && now - events[0].at > windowMs) events.shift();
  };
  const consumed = () => events.reduce((sum, event) => sum + event.tokens, 0);

  return {
    remaining() {
      pruneExpired();
      return maxTokens - consumed() - reserved;
    },
    reserve(tokens) {
      pruneExpired();
      if (consumed() + reserved + tokens > maxTokens) return false;
      reserved += tokens;
      return true;
    },
    refund(tokens) {
      reserved -= tokens;
    },
    record(inputTokens, outputTokens) {
      events.push({ at: Date.now(), tokens: inputTokens + outputTokens });
    },
  };
};