import { reviewRequestSchema, type Review } from "@code-lens-ai/shared";
import { dailyQuota } from "../daily-quota.js";
import { rateLimit } from "../middleware.js";
import { logAndExit, type TtlCache } from "../utils.js";
import { reviewCode } from "../ai.js";
import { logger } from "../logger.js";
import type { OpencodeClient } from "@opencode-ai/sdk";
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
  client: OpencodeClient,
  cache: TtlCache<Review>,
) => {
  const router = Router();

  router.post(
    "/review",
    rateLimit,
    dailyQuota,
    async (req: Request, res: Response) => {
      const parsed = reviewRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({
            error: parsed.error.issues[0]?.message ?? "Invalid request.",
          });
        return;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REVIEW_TIMEOUT_MS);
      try {
        const { review, cached } = await reviewCode(client, {
          code: parsed.data.code,
          cache,
          signal: controller.signal,
        });
        res.setHeader("X-Cache", cached ? "HIT" : "MISS");
        res.json(review);
      } catch (error) {
        const isTimeout = controller.signal.aborted;
        logger.error({ err: error }, "Review request failed");
        res.status(isTimeout ? 504 : 500).json({
          error: isTimeout
            ? "Review timed out. Please try again."
            : "Review failed, try again!",
        });
      } finally {
        clearTimeout(timer);
      }
    },
  );

  return router;
};
