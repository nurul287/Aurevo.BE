import { Request, Response, NextFunction } from "express";
import * as WishlistService from "./wishlist.service";
import type { AddWishlistItemInput } from "./wishlist.schema";

export const getWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await WishlistService.getWishlist(req.user!.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await WishlistService.addItem(req.user!.id, req.body as AddWishlistItemInput);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const removeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await WishlistService.removeItem(req.user!.id, req.params.id!);
    res.status(200).json({ success: true, message: "Item removed from wishlist" });
  } catch (err) {
    next(err);
  }
};

export const removeByProductId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await WishlistService.removeByProductId(req.user!.id, req.params.productId!);
    res.status(200).json({ success: true, message: "Item removed from wishlist" });
  } catch (err) {
    next(err);
  }
};

export const clearWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await WishlistService.clearWishlist(req.user!.id);
    res.status(200).json({ success: true, message: "Wishlist cleared" });
  } catch (err) {
    next(err);
  }
};
