import { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../lib/supabase";
import { UnauthorizedError, ForbiddenError } from "../errors";

/**
 * Verifies via Supabase's own getClaims(), which fetches/caches the project's
 * JWKS and validates locally. Required because Supabase now issues tokens
 * signed with an asymmetric key (ES256) by default — a static HS256 secret
 * check (the old approach) rejects every such token as invalid.
 */
async function verifyToken(token: string): Promise<JwtPayload> {
  const { data, error } = await supabaseAdmin.auth.getClaims(token);
  if (error || !data) throw error ?? new Error("Token verification failed");
  return data.claims;
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) throw new UnauthorizedError("No token provided");

    const token = authHeader.split(" ")[1]!;
    const payload = await verifyToken(token);

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

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1]!;
      try {
        const payload = await verifyToken(token);
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
