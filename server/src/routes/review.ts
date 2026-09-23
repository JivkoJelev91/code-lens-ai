import { reviewRequestSchema, type Review } from "@code-lens-ai/shared";
import { dailyQuota } from "../daily-quota.js";
import { rateLimit } from "../middleware.js";
import { logAndExit, type ResultCache } from "../utils.js";
import { reviewCode } from "../ai.js";
import { getRequestLogger } from "../logger.js";
import { AppError } from "../errors.js";
import type { AIProvider } from "../providers/types.js";
import type { CostTracker } from "../cost.js";
import type { Semaphore } from "../semaphore.js";
import type { Request, Response } from "express";
import { Router } from "express";

const REVIEW_TIMEOUT_MS = Number(process.env.REVIEW_TIMEOUT_MS ?? 120_000);
if (
  !Number.isFinite(REVIEW_TIMEOUT_MS) ||
  REVIEW_TIMEOUT_MS < 1_000 ||
  REVIEW_TIMEOUT_MS > 600_000
) {
  logAndExit(`Invalid REVIEW_TIMEOUT_MS: ${process.env.REVIEW_TIMEOUT_MS}`);
}
export const reviewRouter = (
  provider: AIProvider,
  cache: ResultCache<Review>,
  budget: CostTracker,
  semaphore: Semaphore,
) => {
  const router = Router();

  router.post(
    "/review",
    rateLimit,
    dailyQuota,
    async (req: Request, res: Response) => {
      const requestId = res.getHeader("X-Request-Id") as string | undefined;
      const parsed = reviewRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: parsed.error.issues[0]?.message ?? "Invalid request.",
          issues: parsed.error.issues.map((issue) => issue.message),
          requestId,
        });
        return;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REVIEW_TIMEOUT_MS);
      try {
        const { review, cached } = await reviewCode(provider, {
          request: parsed.data,
          cache,
          budget,
          semaphore,
          signal: controller.signal,
        });
        res.setHeader("X-Cache", cached ? "HIT" : "MISS");
        res.json(review);
      } catch (error) {
        const log = getRequestLogger();
        if (error instanceof AppError) {
          log.warn({ code: error.code, retriable: error.retriable }, "Review request rejected");
          res.status(error.status).json({ error: error.message, requestId });
          return;
        }
        log.error({ err: error }, "Review request failed");
        res.status(500).json({ error: "Review failed, try again!", requestId });
      } finally {
        clearTimeout(timer);
      }
    },
  );

  return router;
};
