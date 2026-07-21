import { Request, Response, NextFunction } from "express";
import { getAdminDashboard } from "./admin.service";
import { getAiMetrics } from "../chat/chat.metrics";

export const getDashboard = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getAdminDashboard();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getAiMetricsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Clamp to a sane window; default 7 days. Bad input falls back, never 500s.
    const parsed = Number(req.query.days);
    const days = Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 90) : 7;
    const data = await getAiMetrics(days);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
