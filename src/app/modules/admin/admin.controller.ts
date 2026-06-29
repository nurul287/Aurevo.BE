import { Request, Response, NextFunction } from "express";
import { getAdminDashboard } from "./admin.service";

export const getDashboard = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getAdminDashboard();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
