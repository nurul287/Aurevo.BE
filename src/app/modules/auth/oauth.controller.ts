import { NextFunction, Request, Response } from "express";
import { config } from "../../config";
import { getOAuthUrl, handleOAuthCallback, redeemExchangeCode } from "./oauth.service";

export const oauthUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const provider = req.query.provider as string;
    const url = getOAuthUrl(provider);
    res.status(200).json({ success: true, data: { url } });
  } catch (err) {
    next(err);
  }
};

// The callback is a browser navigation, not an API call — every failure path
// must redirect back to the frontend, never render a JSON error body.
export const oauthCallback = async (req: Request, res: Response): Promise<void> => {
  const fail = (error: string, description: string) => {
    const params = new URLSearchParams({ error, error_description: description });
    res.redirect(`${config.FRONTEND_URL}/auth/error?${params}`);
  };

  try {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    if (error) {
      fail(error, error_description ?? "");
      return;
    }

    if (!code || !state) {
      fail("invalid_request", "Missing code or state");
      return;
    }

    const redirectUrl = await handleOAuthCallback(code, state);
    res.redirect(redirectUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth sign-in failed";
    fail("oauth_failed", message);
  }
};

export const oauthSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const code = req.query.code as string;
    if (!code) {
      next(new Error("Missing exchange code"));
      return;
    }
    const data = redeemExchangeCode(code);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
