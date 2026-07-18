import { config } from "../app/config";

/**
 * Thin wrapper around Steadfast Courier's REST API (Bangladesh courier).
 * No SDK — plain fetch, same approach as voyage.ts. Auth is two static
 * headers (Api-Key / Secret-Key), not a token endpoint.
 */

export type SteadfastConsignment = {
  consignment_id: number;
  invoice: string;
  tracking_code: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type CreateOrderResponse = {
  status: number;
  message: string;
  consignment: SteadfastConsignment;
};

type StatusResponse = {
  status: number;
  delivery_status: string;
};

type BalanceResponse = {
  status: number;
  current_balance: number;
};

export type CreateOrderPayload = {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  delivery_type?: 0 | 1;
};

export function courierEnabled(): boolean {
  return Boolean(config.COURIER_API_KEY && config.COURIER_SECRET_KEY);
}

function assertEnabled(): void {
  if (!courierEnabled()) {
    throw new Error("Courier integration is not configured (COURIER_API_KEY / COURIER_SECRET_KEY unset)");
  }
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  assertEnabled();

  const res = await fetch(`${config.COURIER_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Api-Key": config.COURIER_API_KEY!,
      "Secret-Key": config.COURIER_SECRET_KEY!,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const responseBody = await res.text().catch(() => "");
    throw new Error(`Steadfast request failed (${res.status}): ${responseBody}`);
  }

  return (await res.json()) as T;
}

/** Books a real consignment with Steadfast — commits real COD/delivery-charge money, no cancel endpoint exists. */
export async function createConsignment(payload: CreateOrderPayload): Promise<SteadfastConsignment> {
  const result = await request<CreateOrderResponse>("POST", "/create_order", payload);
  return result.consignment;
}

export async function getStatusByConsignmentId(consignmentId: number): Promise<string> {
  const result = await request<StatusResponse>("GET", `/status_by_cid/${consignmentId}`);
  return result.delivery_status;
}

export async function getStatusByTrackingCode(trackingCode: string): Promise<string> {
  const result = await request<StatusResponse>("GET", `/status_by_trackingcode/${trackingCode}`);
  return result.delivery_status;
}

export async function getBalance(): Promise<number> {
  const result = await request<BalanceResponse>("GET", "/get_balance");
  return result.current_balance;
}

/** Normalizes a Bangladeshi phone number to Steadfast's required 11-digit 01XXXXXXXXX form. */
export function normalizeBdPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) digits = digits.slice(3);
  else if (digits.startsWith("88")) digits = digits.slice(2);
  if (!digits.startsWith("0")) digits = `0${digits}`;
  return digits;
}
