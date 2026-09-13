import { readFile } from 'node:fs/promises';
import type { OpencodeClient } from '@opencode-ai/sdk';

export type Issue = {
  severity: 'high' | 'medium' | 'low';
  category: string;
  line: number | null;
  message: string;
  suggestion: string;
};

export type Review = {
  language: string;
  framework: string;
  score: number;
  summary: string;
  issues: Issue[];
  improvements: string[];
  refactoredCode: string;
};

const SKILL_PATH = new URL('../../.opencode/skills/code-review/SKILL.md', import.meta.url);

const buildPrompt = (skill: string, code: string) => `You are a senior code reviewer.
Apply these rules:

${skill}

Detect the language and framework, then review the code.
Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "language": "string",
  "framework": "string",
  "score": 0-10,
  "summary": "string",
  "issues": [{ "severity": "high|medium|low", "category": "string", "line": number|null, "message": "string", "suggestion": "string" }],
  "improvements": ["string"],
  "refactoredCode": "string"
}

Code:
\`\`\`
${code}
\`\`\``;

export async function reviewCode(client: OpencodeClient, code: string): Promise<Review> {
  const skill = await readFile(SKILL_PATH, 'utf8');
  const prompt = buildPrompt(skill, code);

  const created = await client.session.create();
  if (!created.data) throw new Error('Failed to create session.');
  const response = await client.session.prompt({
    path: { id: created.data.id },
    body: { parts: [{ type: 'text', text: prompt }] },
  });
  if (!response.data) throw new Error('Failed to get AI response.');

  const text = response.data.parts
    .filter((part) => part.type === 'text' && !part.synthetic && !part.ignored)
    .map((part) => (part as Extract<typeof part, { type: 'text' }>).text)
    .join('\n');

  const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|```$/g, '')) as unknown;
  if (typeof parsed !== 'object' || parsed === null) throw new Error('AI did not return a JSON object.');
  const review = parsed as Partial<Review>;
  if (typeof review.score !== 'number' || !Array.isArray(review.issues)) throw new Error('AI response is missing required fields.');
  return review as Review;
}