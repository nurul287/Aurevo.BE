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

export const oauthCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    if (error) {
      const params = new URLSearchParams({ error, error_description: error_description ?? "" });
      res.redirect(`${config.FRONTEND_URL}/auth/error?${params}`);
      return;
    }

    if (!code || !state) {
      next(new Error("Missing code or state"));
      return;
    }

    const redirectUrl = await handleOAuthCallback(code, state);
    res.redirect(redirectUrl);
  } catch (err) {
    next(err);
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
