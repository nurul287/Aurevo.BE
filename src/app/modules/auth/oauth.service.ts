import crypto from "crypto";
import { config } from "../../config";
import { AppError } from "../../errors/AppError";

interface PkceEntry {
  codeVerifier: string;
  createdAt: number;
}

interface ExchangeEntry {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  createdAt: number;
}

const PKCE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const EXCHANGE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const pkceStore = new Map<string, PkceEntry>();
const exchangeStore = new Map<string, ExchangeEntry>();

// Sweep expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of pkceStore) {
    if (now - entry.createdAt > PKCE_TTL_MS) pkceStore.delete(key);
  }
  for (const [key, entry] of exchangeStore) {
    if (now - entry.createdAt > EXCHANGE_TTL_MS) exchangeStore.delete(key);
  }
}, 5 * 60 * 1000).unref();

const ALLOWED_PROVIDERS = ["google", "facebook"] as const;
type OAuthProvider = (typeof ALLOWED_PROVIDERS)[number];

function isAllowedProvider(provider: string): provider is OAuthProvider {
  return (ALLOWED_PROVIDERS as readonly string[]).includes(provider);
}

export function getOAuthUrl(provider: string): string {
  if (!isAllowedProvider(provider)) {
    throw new AppError(400, `Unsupported provider: ${provider}`, "VALIDATION_ERROR");
  }

  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const state = crypto.randomBytes(16).toString("base64url");

  pkceStore.set(state, { codeVerifier, createdAt: Date.now() });

  const callbackUrl = `${config.BACKEND_URL}/api/auth/oauth/callback`;
  const params = new URLSearchParams({
    provider,
    redirect_to: callbackUrl,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  return `${config.SUPABASE_URL}/auth/v1/authorize?${params}`;
}

export async function handleOAuthCallback(code: string, state: string): Promise<string> {
  const entry = pkceStore.get(state);
  if (!entry || Date.now() - entry.createdAt > PKCE_TTL_MS) {
    pkceStore.delete(state);
    throw new AppError(400, "Invalid or expired OAuth state", "OAUTH_STATE_INVALID");
  }
  pkceStore.delete(state);

  const response = await fetch(
    `${config.SUPABASE_URL}/auth/v1/token?grant_type=pkce`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ auth_code: code, code_verifier: entry.codeVerifier }),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error_description?: string };
    throw new AppError(502, body.error_description ?? "OAuth token exchange failed", "OAUTH_EXCHANGE_FAILED");
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
  };

  const exchangeCode = crypto.randomBytes(16).toString("base64url");
  exchangeStore.set(exchangeCode, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at ?? null,
    createdAt: Date.now(),
  });

  return `${config.FRONTEND_URL}/?oauth_code=${exchangeCode}`;
}

export function redeemExchangeCode(code: string): {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
} {
  const entry = exchangeStore.get(code);
  if (!entry || Date.now() - entry.createdAt > EXCHANGE_TTL_MS) {
    exchangeStore.delete(code);
    throw new AppError(400, "Invalid or expired exchange code", "OAUTH_CODE_INVALID");
  }
  exchangeStore.delete(code);

  return {
    accessToken: entry.accessToken,
    refreshToken: entry.refreshToken,
    expiresAt: entry.expiresAt,
  };
}
