export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retriable: boolean;

  constructor(
    code: string,
    status: number,
    retriable: boolean,
    message: string,
    cause?: unknown,
  ) {
    if (cause !== undefined) super(message, { cause });
    else super(message);
    this.code = code;
    this.status = status;
    this.retriable = retriable;
    this.name = this.constructor.name;
  }
}

export class AIAbortError extends AppError {
  constructor() {
    super('AI_TIMEOUT', 504, false, 'Review timed out. Please try again.');
  }
}

export class AIProviderError extends AppError {
  constructor(message = 'The AI service is unavailable. Please try again.', cause?: unknown) {
    super('AI_PROVIDER_ERROR', 502, true, message, cause);
  }
}

export class AIOutputError extends AppError {
  constructor(message = 'The AI produced an unreadable review. Please try again.', cause?: unknown) {
    super('AI_OUTPUT_ERROR', 502, false, message, cause);
  }
}

export class AIBudgetExceededError extends AppError {
  constructor(message = 'The AI budget is exhausted for this hour. Try again later.') {
    super('AI_BUDGET_EXCEEDED', 429, false, message);
  }
}