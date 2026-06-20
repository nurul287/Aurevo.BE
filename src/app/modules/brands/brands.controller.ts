import { Request, Response, NextFunction } from "express";
import * as BrandService from "./brands.service";
import type { GetBrandsInput } from "./brands.schema";

export const getBrands = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await BrandService.getBrands(req.query as unknown as GetBrandsInput);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getBrandById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await BrandService.getBrandById(req.params.id!);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const createBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await BrandService.createBrand(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await BrandService.updateBrand(req.params.id!, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await BrandService.deleteBrand(req.params.id!);
    res.status(200).json({ success: true, message: "Brand deleted successfully" });
  } catch (err) { next(err); }
};
