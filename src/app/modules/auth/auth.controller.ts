import { Request, Response, NextFunction } from "express";
import * as AuthService from "./auth.service";
import type { UpdateProfileInput, CreateAddressInput, UpdateAddressInput } from "./auth.schema";

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await AuthService.getMe(req.user!.id);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await AuthService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getAddresses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await AuthService.getAddresses(req.user!.id);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const createAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await AuthService.createAddress(req.user!.id, req.body as CreateAddressInput);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await AuthService.updateAddress(req.user!.id, req.params.id!, req.body as UpdateAddressInput);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await AuthService.deleteAddress(req.user!.id, req.params.id!);
    res.status(200).json({ success: true, message: "Address deleted" });
  } catch (err) { next(err); }
};
