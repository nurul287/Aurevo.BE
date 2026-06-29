import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { UnauthorizedError, ForbiddenError } from "../errors";

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) throw new UnauthorizedError("No token provided");

    const token = authHeader.split(" ")[1]!;
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) throw new UnauthorizedError("Invalid or expired token");

    req.user = {
      id: user.id,
      email: user.email ?? "",
      role: (user.app_metadata?.role as string) ?? user.role ?? "user",
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    next(new UnauthorizedError("Invalid or expired token"));
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1]!;
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email ?? "",
          role: (user.app_metadata?.role as string) ?? user.role ?? "user",
        };
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
