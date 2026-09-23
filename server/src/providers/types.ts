export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface AIProviderResult {
  text: string;
  usage?: AIUsage;
}

export interface AIProvider {
  prompt(text: string, options?: { signal?: AbortSignal }): Promise<AIProviderResult>;
}