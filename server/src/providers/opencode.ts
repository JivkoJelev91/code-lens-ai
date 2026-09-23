import type { OpencodeClient } from "@opencode-ai/sdk";
import type { AIProvider, AIProviderResult, AIUsage } from "./types.js";
import { AIAbortError, AIProviderError } from "../errors.js";

export class OpencodeAIProvider implements AIProvider {
  constructor(private client: OpencodeClient) {}

  async prompt(
    text: string,
    options?: { signal?: AbortSignal },
  ): Promise<AIProviderResult> {
    const signal = options?.signal;

    let created;
    try {
      created = await this.client.session.create();
    } catch (err) {
      throw new AIProviderError("AI session could not be created.", err);
    }
    if (!created.data) throw new AIProviderError("AI session could not be created.");
    const sessionId = created.data.id;

    try {
      if (signal?.aborted) throw new AIAbortError();
      let response;
      try {
        response = await this.client.session.prompt({
          path: { id: sessionId },
          body: { parts: [{ type: "text", text: text }] },
          signal,
        });
      } catch (err) {
        if (signal?.aborted) throw new AIAbortError();
        throw new AIProviderError("AI request failed.", err);
      }
      if (!response.data) throw new AIProviderError("AI returned no data.");

      const reply = response.data.parts
        .filter(
          (part) => part.type === "text" && !part.synthetic && !part.ignored,
        )
        .map((part) => (part as Extract<typeof part, { type: "text" }>).text)
        .join("\n");

      const tokens = response.data.info?.tokens;
      const usage: AIUsage = {
        inputTokens: tokens?.input ?? 0,
        outputTokens: tokens?.output ?? 0,
        cost: response.data.info?.cost ?? 0,
      };
      return { text: reply, usage };
    } finally {
      if (signal?.aborted) {
        await this.client.session.abort({ path: { id: sessionId } }).catch(() => {});
      }
      await this.client.session.delete({ path: { id: sessionId } }).catch(() => {});
    }
  }
}
