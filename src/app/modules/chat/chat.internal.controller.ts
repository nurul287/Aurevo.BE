import { Request, Response, NextFunction } from "express";
import { and, isNull, lt, or } from "drizzle-orm";
import { db } from "../../../db";
import { conversations } from "../../../db/schema";
import { config } from "../../config";
import { UnauthorizedError } from "../../errors";
import { logger } from "../../../lib/logger";

const GUEST_RETENTION_MS = 48 * 60 * 60 * 1000; // 48 hours
const USER_RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Machine-to-machine only — no JWT/session auth. Called daily by a Railway
 * cron trigger. Deletes stale conversations; `messages` cascade automatically.
 */
export const cleanupChatHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.headers["x-internal-task-token"];
    if (token !== config.INTERNAL_TASK_TOKEN) {
      throw new UnauthorizedError("Invalid internal task token");
    }

    const now = Date.now();
    const guestCutoff = new Date(now - GUEST_RETENTION_MS).toISOString();
    const userCutoff = new Date(now - USER_RETENTION_MS).toISOString();

    const deleted = await db
      .delete(conversations)
      .where(
        or(
          and(isNull(conversations.userId), lt(conversations.lastActivityAt, guestCutoff)),
          lt(conversations.lastActivityAt, userCutoff),
        ),
      )
      .returning({ id: conversations.id });

    logger.info({ deletedCount: deleted.length }, "chat history cleanup completed");
    res.status(200).json({ success: true, data: { deletedCount: deleted.length } });
  } catch (err) {
    next(err);
  }
};
