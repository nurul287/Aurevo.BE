import { Request, Response, NextFunction } from "express";
import * as ProductService from "./products.service";
import type { GetProductsInput } from "./products.schema";

/** Mirrors the adminRoles list in middlewares/auth.ts requireAdmin — keep in sync. */
function isAdminRequest(req: Request): boolean {
  const role = req.user?.role ?? "";
  return role === "admin" || role === "super_admin" || role === "service_role";
}

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await ProductService.getProducts(
      req.query as unknown as GetProductsInput,
      isAdminRequest(req),
    );
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ProductService.getProductById(req.params.id!, isAdminRequest(req));
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getProductBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ProductService.getProductBySlug(req.params.slug!, isAdminRequest(req));
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getFeaturedProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 8;
    const data = await ProductService.getFeaturedProducts(limit);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ProductService.createProduct(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ProductService.updateProduct(req.params.id!, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await ProductService.deleteProduct(req.params.id!);
    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (err) { next(err); }
};

export const bulkUpdateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ProductService.bulkUpdateStatus(req.body);
    res.status(200).json({ success: true, data, message: `${data.length} product(s) updated` });
  } catch (err) { next(err); }
};

export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await ProductService.bulkDelete(req.body);
    res.status(200).json({ success: true, message: "Products deleted successfully" });
  } catch (err) { next(err); }
};
