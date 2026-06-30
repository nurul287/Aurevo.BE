import { Request, Response, NextFunction } from "express";
import * as VariantService from "./variants.service";
import type { CreateVariantInput, UpdateVariantInput, AdjustStockInput, BulkCreateVariantsInput, GetAllVariantsQuery } from "./variants.schema";

export const getAllVariants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, pagination } = await VariantService.getAllVariants(req.query as unknown as GetAllVariantsQuery);
    res.status(200).json({ success: true, data, meta: { pagination } });
  } catch (err) { next(err); }
};

export const getVariants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await VariantService.getVariants(req.params.productId!);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getVariantById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await VariantService.getVariantById(req.params.productId!, req.params.id!);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const createVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await VariantService.createVariant(req.params.productId!, req.body as CreateVariantInput);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await VariantService.updateVariant(req.params.productId!, req.params.id!, req.body as UpdateVariantInput);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await VariantService.deleteVariant(req.params.productId!, req.params.id!);
    res.status(200).json({ success: true, message: "Variant deleted successfully" });
  } catch (err) { next(err); }
};

export const bulkCreateVariants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await VariantService.bulkCreateVariants(req.params.productId!, req.body as BulkCreateVariantsInput);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await VariantService.adjustStock(req.params.productId!, req.params.id!, req.body as AdjustStockInput);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};
