import { Request, Response, NextFunction } from "express";
import * as CategoryService from "./categories.service";
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
    const data = await CategoryService.createCategory(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await CategoryService.updateCategory(req.params.id!, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await CategoryService.deleteCategory(req.params.id!);
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (err) { next(err); }
};
