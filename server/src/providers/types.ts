export interface AIProvider {
  prompt(text: string, options?: { signal?: AbortSignal }): Promise<string>;
}