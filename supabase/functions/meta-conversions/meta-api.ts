/** Meta Conversions API helpers (server-side only). */

export const META_GRAPH_VERSION = "v22.0";
export const DEFAULT_SITE_URL = "https://aurevofashion.store";
export const DEFAULT_CURRENCY = "BDT";

export type MetaPurchasePayload = {
  orderId: string;
  value: number;
  numItems: number;
  contentIds: string[];
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  createdAt?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  fbc?: string | null;
  fbp?: string | null;
};

export async function sha256Hex(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Meta: lowercase, remove spaces and symbols except leading + for country code. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `880${digits.slice(1)}`;
  if (digits.length === 10 || digits.length === 11)
    return `880${digits.replace(/^0/, "")}`;
  return digits;
}

export async function hashEmail(email: string): Promise<string | undefined> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return undefined;
  return sha256Hex(trimmed);
}

export async function hashPhone(phone: string): Promise<string | undefined> {
  const normalized = normalizePhone(phone);
  if (!normalized) return undefined;
  return sha256Hex(normalized);
}

function splitNameFromAddress(
  address: Record<string, unknown> | null | undefined,
): {
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
} {
  if (!address || typeof address !== "object") return {};

  const first =
    typeof address.first_name === "string"
      ? address.first_name
      : typeof address.firstName === "string"
        ? address.firstName
        : undefined;
  const last =
    typeof address.last_name === "string"
      ? address.last_name
      : typeof address.lastName === "string"
        ? address.lastName
        : undefined;

  return {
    firstName: first,
    lastName: last,
    city: typeof address.city === "string" ? address.city : undefined,
    state: typeof address.state === "string" ? address.state : undefined,
    zip:
      typeof address.postal_code === "string"
        ? address.postal_code
        : typeof address.zip === "string"
          ? address.zip
          : undefined,
    country: typeof address.country === "string" ? address.country : undefined,
  };
}

export function addressHintsFromOrder(order: {
  shipping_address?: unknown;
  billing_address?: unknown;
}): ReturnType<typeof splitNameFromAddress> {
  const shipping =
    order.shipping_address && typeof order.shipping_address === "object"
      ? (order.shipping_address as Record<string, unknown>)
      : null;
  const billing =
    order.billing_address && typeof order.billing_address === "object"
      ? (order.billing_address as Record<string, unknown>)
      : null;
  return {
    ...splitNameFromAddress(billing),
    ...splitNameFromAddress(shipping),
  };
}

export async function buildUserData(
  payload: MetaPurchasePayload,
): Promise<Record<string, unknown>> {
  const userData: Record<string, unknown> = {};

  const em = payload.email ? await hashEmail(payload.email) : undefined;
  if (em) userData.em = [em];

  const ph = payload.phone ? await hashPhone(payload.phone) : undefined;
  if (ph) userData.ph = [ph];

  if (payload.firstName) userData.fn = [await sha256Hex(payload.firstName)];
  if (payload.lastName) userData.ln = [await sha256Hex(payload.lastName)];
  if (payload.city) userData.ct = [await sha256Hex(payload.city)];
  if (payload.state) userData.st = [await sha256Hex(payload.state)];
  if (payload.zip) userData.zp = [await sha256Hex(payload.zip)];
  if (payload.country) userData.country = [await sha256Hex(payload.country)];

  if (payload.clientIp) userData.client_ip_address = payload.clientIp;
  if (payload.userAgent) userData.client_user_agent = payload.userAgent;
  if (payload.fbc) userData.fbc = payload.fbc;
  if (payload.fbp) userData.fbp = payload.fbp;

  return userData;
}

export async function sendMetaPurchaseEvent(options: {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
  siteUrl: string;
  payload: MetaPurchasePayload;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const { pixelId, accessToken, testEventCode, siteUrl, payload } = options;

  const eventTime = payload.createdAt
    ? Math.floor(new Date(payload.createdAt).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  const userData = await buildUserData(payload);

  const event = {
    event_name: "Purchase",
    event_time: eventTime,
    event_id: payload.orderId,
    action_source: "website",
    event_source_url: `${siteUrl.replace(/\/$/, "")}/order-confirmation`,
    user_data: userData,
    custom_data: {
      currency: DEFAULT_CURRENCY,
      value: payload.value,
      content_ids: payload.contentIds,
      content_type: "product",
      num_items: payload.numItems,
      order_id: payload.orderId,
    },
  };

  const body: Record<string, unknown> = { data: [event] };
  if (testEventCode?.trim()) {
    body.test_event_code = testEventCode.trim();
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  return { ok: response.ok, status: response.status, body: text };
}
