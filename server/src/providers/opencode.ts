import type { OpencodeClient } from "@opencode-ai/sdk";
import type { AIProvider } from "./types.js";

export class OpencodeAIProvider implements AIProvider {
  constructor(private client: OpencodeClient) {}

  async prompt(
    text: string,
    options?: { signal?: AbortSignal },
  ): Promise<string> {
    const created = await this.client.session.create();
    if (!created.data) throw new Error("Failed to create session.");
    const sessionId = created.data.id;
    const signal = options?.signal;

    try {
      if (signal?.aborted) throw new Error("Review aborted.");
      const response = await this.client.session.prompt({
        path: { id: sessionId },
        body: { parts: [{ type: "text", text: text }] },
        signal,
      });
      if (!response.data) throw new Error("Failed to get AI response.");

      return response.data.parts
        .filter(
          (part) => part.type === "text" && !part.synthetic && !part.ignored,
        )
        .map((part) => (part as Extract<typeof part, { type: "text" }>).text)
        .join("\n");
    } finally {
      if (signal?.aborted) {
        await this.client.session.abort({ path: { id: sessionId } }).catch(() => {});
      }
      await this.client.session.delete({ path: { id: sessionId } }).catch(() => {});
    }
  }
}
