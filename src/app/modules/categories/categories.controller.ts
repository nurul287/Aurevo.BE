import { Request, Response, NextFunction } from "express";
import * as CategoryService from "./categories.service";
import { ValidationError } from "../../errors";
import type { GetCategoriesInput } from "./categories.schema";

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await CategoryService.getCategories(req.query as unknown as GetCategoriesInput);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await CategoryService.getCategoryById(req.params.id!);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, description, parentId, imageUrl, sortOrder, isActive } = req.body as Record<string, string>;
    const fieldErrors: Record<string, string[]> = {};
    if (!name?.trim()) fieldErrors["name"] = ["Name is required"];
    if (!slug?.trim()) fieldErrors["slug"] = ["Slug is required"];
    if (Object.keys(fieldErrors).length) {
      return next(new ValidationError("Validation failed", fieldErrors));
    }
    const data = await CategoryService.createCategory(
      {
        name: name.trim(),
        slug: slug.trim(),
        description: description?.trim() || undefined,
        parentId: parentId || null,
        imageUrl: imageUrl || null,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : 0,
        isActive: isActive !== "false",
      },
      req.file
    );
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, description, parentId, imageUrl, sortOrder, isActive } = req.body as Record<string, string>;
    const data = await CategoryService.updateCategory(
      req.params.id!,
      {
        ...(name !== undefined && { name: name.trim() }),
        ...(slug !== undefined && { slug: slug.trim() }),
        ...(description !== undefined && { description: description.trim() || null }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder, 10) }),
        ...(isActive !== undefined && { isActive: isActive !== "false" }),
      },
      req.file
    );
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await CategoryService.deleteCategory(req.params.id!);
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (err) { next(err); }
};

export const uploadCategoryImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "No file uploaded" } });
      return;
    }
    const data = await CategoryService.setCategoryImage(req.params.id!, req.file);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteCategoryImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await CategoryService.removeCategoryImage(req.params.id!);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};
