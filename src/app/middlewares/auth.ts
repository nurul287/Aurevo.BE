import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { UnauthorizedError, ForbiddenError } from "../errors";

interface SupabaseJwtPayload {
  sub: string;
  email: string;
  role: string;
  app_metadata?: { role?: string };
  user_metadata?: Record<string, unknown>;
}

function verifySupabaseToken(token: string): SupabaseJwtPayload {
  return jwt.verify(token, config.SUPABASE_JWT_SECRET) as SupabaseJwtPayload;
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) throw new UnauthorizedError("No token provided");

    const token = authHeader.split(" ")[1];
    const decoded = verifySupabaseToken(token!);

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.app_metadata?.role ?? decoded.role ?? "user",
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    next(new UnauthorizedError("Invalid or expired token"));
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = verifySupabaseToken(token!);
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.app_metadata?.role ?? decoded.role ?? "user",
      };
    }

    const guestSessionId = req.headers["x-guest-session"] as string | undefined;
    if (guestSessionId) req.guestSessionId = guestSessionId;

    next();
  } catch {
    next();
  }
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) return next(new UnauthorizedError());
  if (req.user.role !== "admin" && req.user.role !== "service_role") {
    return next(new ForbiddenError("Admin access required"));
  }
  next();
};
