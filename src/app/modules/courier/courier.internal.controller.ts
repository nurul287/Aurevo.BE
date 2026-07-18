import { Request, Response, NextFunction } from "express";
import { config } from "../../config";
import { UnauthorizedError } from "../../errors";
import { logger } from "../../../lib/logger";
import { pollActiveShipments } from "./courier.service";

/**
 * Machine-to-machine only — no JWT/session auth. Called periodically by a
 * Railway cron trigger. Reconciliation safety net for shipments whose
 * webhook was missed or dropped — see courier.service.ts pollActiveShipments.
 */
export const pollCourierStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.headers["x-internal-task-token"];
    if (token !== config.INTERNAL_TASK_TOKEN) {
      throw new UnauthorizedError("Invalid internal task token");
    }

    const { updatedCount } = await pollActiveShipments();
    logger.info({ updatedCount }, "courier status poll completed");
    res.status(200).json({ success: true, data: { updatedCount } });
  } catch (err) {
    next(err);
  }
};
