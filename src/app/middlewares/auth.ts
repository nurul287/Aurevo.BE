import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../app/config";
import { UnauthorizedError, ForbiddenError } from "../errors";

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  app_metadata?: { role?: string };
}

function verifyToken(token: string): SupabaseJwtPayload {
  return jwt.verify(token, config.SUPABASE_JWT_SECRET) as SupabaseJwtPayload;
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) throw new UnauthorizedError("No token provided");

    const token = authHeader.split(" ")[1]!;
    const payload = verifyToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email ?? "",
      role: payload.app_metadata?.role ?? payload.role ?? "user",
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
      const token = authHeader.split(" ")[1]!;
      try {
        const payload = verifyToken(token);
        req.user = {
          id: payload.sub,
          email: payload.email ?? "",
          role: payload.app_metadata?.role ?? payload.role ?? "user",
        };
      } catch {
        // invalid token — treat as unauthenticated
      }
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
  const adminRoles = ["admin", "super_admin", "service_role"];
  if (!adminRoles.includes(req.user.role)) {
    return next(new ForbiddenError("Admin access required"));
  }
  next();
};
