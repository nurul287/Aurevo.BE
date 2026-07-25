import { Request, Response, NextFunction } from "express";
import * as AuthService from "./auth.service";
import type {
  UpdateProfileInput,
  CreateAddressInput,
  UpdateAddressInput,
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  UpdatePasswordInput,
  ResendConfirmationInput,
} from "./auth.schema";

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await AuthService.getMe(req.user!.id);
    // Role lives in the Supabase Auth JWT (app_metadata.role, already resolved
    // onto req.user by the authenticate middleware) — the profiles table has
    // no role column of its own, so it must be merged in here rather than
    // read back from the DB row.
    res.status(200).json({ success: true, data: { ...data, role: req.user!.role } });
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

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await AuthService.login(req.body as LoginInput);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await AuthService.register(req.body as RegisterInput);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization!.replace(/^Bearer\s+/i, "");
    await AuthService.logout(token);
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) { next(err); }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await AuthService.refreshSession(req.body as RefreshTokenInput);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { redirectTo, ...input } = req.body as ForgotPasswordInput;
    await AuthService.forgotPassword(input, redirectTo);
    res.status(200).json({ success: true, message: "If that email is registered you will receive a reset link" });
  } catch (err) { next(err); }
};

export const updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await AuthService.updatePassword(req.user!.id, req.body as UpdatePasswordInput);
    res.status(200).json({ success: true, message: "Password updated" });
  } catch (err) { next(err); }
};

export const resendConfirmation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await AuthService.resendConfirmation(req.body as ResendConfirmationInput);
    res.status(200).json({ success: true, message: "Confirmation email sent" });
  } catch (err) { next(err); }
};

export const uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "No file uploaded" } });
      return;
    }
    const data = await AuthService.uploadAvatar(req.user!.id, req.file);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await AuthService.deleteAvatar(req.user!.id);
    res.status(200).json({ success: true, message: "Avatar deleted" });
  } catch (err) { next(err); }
};
