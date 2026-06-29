import { Request, Response, NextFunction } from "express";
import * as InventoryService from "./inventory.service";
import type { GetInventoryInput, UpsertInventoryInput, AdjustInventoryInput, GetMovementsInput } from "./inventory.schema";

export const getInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await InventoryService.getInventory(req.query as unknown as GetInventoryInput);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getInventoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await InventoryService.getInventoryById(req.params.id!);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const upsertInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await InventoryService.upsertInventory(req.body as UpsertInventoryInput);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const adjustInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await InventoryService.adjustInventory(req.params.id!, req.body as AdjustInventoryInput, req.user?.id);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getLowStockAlerts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await InventoryService.getLowStockAlerts();
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await InventoryService.getMovements(req.query as unknown as GetMovementsInput);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getVariantAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ids = [req.query["variantIds"]].flat().filter(Boolean) as string[];
    const data = await InventoryService.getVariantAvailability(ids);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};
