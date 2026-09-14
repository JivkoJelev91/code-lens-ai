import { z } from 'zod';

export const MAX_CODE_LENGTH = 10_000;
const MAX_STRING_LENGTH = 5_000;

export const reviewRequestSchema = z.object({
  code: z
    .string({ error: 'Invalid request body.' })
    .trim()
    .min(1, 'Missing or empty code.')
    .max(
      MAX_CODE_LENGTH,
      `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters.`,
    ),
}).strict();

export const issueSchema = z.object({
  severity: z.enum(['high', 'medium', 'low']),
  category: z.string().max(MAX_STRING_LENGTH),
  line: z.number().min(0).nullable(),
  message: z.string().max(MAX_STRING_LENGTH),
  suggestion: z.string().max(MAX_STRING_LENGTH),
});

export const reviewSchema = z.object({
  language: z.string().max(200),
  framework: z.string().max(200),
  score: z.number().min(0).max(10),
  summary: z.string().max(MAX_STRING_LENGTH),
  issues: z.array(issueSchema).max(100),
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type Review = z.infer<typeof reviewSchema>;
