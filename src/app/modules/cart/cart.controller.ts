import { Request, Response, NextFunction } from "express";
import * as CartService from "./cart.service";
import { UnauthorizedError } from "../../errors/AppError";
import type { AddItemInput, UpdateItemInput, MigrateCartInput } from "./cart.schema";

function resolveOwner(req: Request) {
  if (req.user) return { userId: req.user.id };
  const guestSessionId = req.headers["x-guest-session"] as string | undefined;
  if (guestSessionId) return { sessionId: guestSessionId };
  return null;
}

export const createGuestSession = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = await CartService.createGuestSession();
    res.status(201).json({ success: true, data: { sessionId: id } });
  } catch (err) { next(err); }
};

export const getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const owner = resolveOwner(req);
    if (!owner) { res.status(200).json({ success: true, data: { items: [], total: "0.00", itemCount: 0 } }); return; }
    const data = await CartService.getCart(owner);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const owner = resolveOwner(req);
    if (!owner) throw new UnauthorizedError("Authentication or guest session required");
    const data = await CartService.addItem(owner, req.body as AddItemInput);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const owner = resolveOwner(req);
    if (!owner) throw new UnauthorizedError("Authentication or guest session required");
    const data = await CartService.updateItem(owner, req.params.id!, req.body as UpdateItemInput);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const removeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const owner = resolveOwner(req);
    if (!owner) throw new UnauthorizedError("Authentication or guest session required");
    await CartService.removeItem(owner, req.params.id!);
    res.status(200).json({ success: true, message: "Item removed from cart" });
  } catch (err) { next(err); }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const owner = resolveOwner(req);
    if (!owner) throw new UnauthorizedError("Authentication or guest session required");
    await CartService.clearCart(owner);
    res.status(200).json({ success: true, message: "Cart cleared" });
  } catch (err) { next(err); }
};

export const migrateCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await CartService.migrateGuestCart(req.user!.id, req.body as MigrateCartInput);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};
