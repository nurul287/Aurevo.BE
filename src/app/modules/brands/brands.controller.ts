import { Request, Response, NextFunction } from "express";
import * as BrandService from "./brands.service";
import { ValidationError } from "../../errors";
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
    const { name, slug, description, logoUrl, websiteUrl, isActive } = req.body as Record<string, string>;
    const fieldErrors: Record<string, string[]> = {};
    if (!name?.trim()) fieldErrors["name"] = ["Name is required"];
    if (!slug?.trim()) fieldErrors["slug"] = ["Slug is required"];
    if (Object.keys(fieldErrors).length) {
      return next(new ValidationError("Validation failed", fieldErrors));
    }
    const data = await BrandService.createBrand(
      {
        name: name.trim(),
        slug: slug.trim(),
        description: description?.trim() || undefined,
        logoUrl: logoUrl || undefined,
        websiteUrl: websiteUrl?.trim() || undefined,
        isActive: isActive !== "false",
      },
      req.file
    );
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, description, logoUrl, websiteUrl, isActive } = req.body as Record<string, string>;
    const data = await BrandService.updateBrand(
      req.params.id!,
      {
        ...(name !== undefined && { name: name.trim() }),
        ...(slug !== undefined && { slug: slug.trim() }),
        ...(description !== undefined && { description: description.trim() || null }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(websiteUrl !== undefined && { websiteUrl: websiteUrl.trim() || null }),
        ...(isActive !== undefined && { isActive: isActive !== "false" }),
      },
      req.file
    );
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await BrandService.deleteBrand(req.params.id!);
    res.status(200).json({ success: true, message: "Brand deleted successfully" });
  } catch (err) { next(err); }
};
