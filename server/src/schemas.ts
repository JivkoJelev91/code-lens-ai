import { z } from 'zod';

export const MAX_CODE_LENGTH = 10_000;

export const reviewRequestSchema = z.object({
  code: z
    .string({ error: 'Invalid request body.' })
    .trim()
    .min(1, 'Missing or empty code.')
    .max(
      MAX_CODE_LENGTH,
      `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters.`,
    ),
});

export const issueSchema = z.object({
  severity: z.enum(['high', 'medium', 'low']),
  category: z.string(),
  line: z.number().nullable(),
  message: z.string(),
  suggestion: z.string(),
});

export const reviewSchema = z.object({
  language: z.string(),
  framework: z.string(),
  score: z.number().finite().min(0).max(10),
  summary: z.string(),
  issues: z.array(issueSchema),
});

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type Issue = z.infer<typeof issueSchema>;
export type Review = z.infer<typeof reviewSchema>;