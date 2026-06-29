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
    if (!name?.trim() || !slug?.trim()) {
      return next(new ValidationError("name and slug are required"));
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
