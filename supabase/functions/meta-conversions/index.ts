import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.58.0";

/** Loose client — Edge Function has no generated Database types in CI `deno check`. */
// deno-lint-ignore no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;
import {
  addressHintsFromOrder,
  DEFAULT_SITE_URL,
  sendMetaPurchaseEvent,
  type MetaPurchasePayload,
} from "./meta-api.ts";

type OrderRow = {
  id: string;
  email: string;
  phone: string | null;
  total_amount: number | string;
  created_at: string;
  shipping_address: unknown;
  billing_address: unknown;
};

type OrderItemRow = {
  variant_id: string | null;
  product_id: string | null;
  quantity: number;
};

type DbWebhookPayload = {
  type: string;
  table: string;
  schema: string;
  record: OrderRow;
  old_record: OrderRow | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getEnv(name: string): string | undefined {
  const value = Deno.env.get(name)?.trim();
  return value || undefined;
}

function requireEnv(name: string): string {
  const value = getEnv(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

function createAdminClient(): AdminClient {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(supabaseUrl, serviceRoleKey) as unknown as AdminClient;
}

async function loadOrderContext(
  supabase: AdminClient,
  orderId: string,
): Promise<MetaPurchasePayload | null> {
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, email, phone, total_amount, created_at, shipping_address, billing_address",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  const order = orderData as OrderRow | null;
  if (!order) return null;

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("variant_id, product_id, quantity")
    .eq("order_id", orderId);

  if (itemsError) throw itemsError;

  const orderItems = (items ?? []) as OrderItemRow[];
  const contentIds = orderItems
    .map((item) => item.variant_id ?? item.product_id)
    .filter((id): id is string => Boolean(id));

  const numItems = orderItems.reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0,
  );

  const hints = addressHintsFromOrder(order);

  return {
    orderId: order.id,
    value: Number(order.total_amount) || 0,
    numItems: numItems || orderItems.length,
    contentIds,
    email: order.email,
    phone: order.phone,
    createdAt: order.created_at,
    ...hints,
  };
}

async function wasAlreadySent(
  supabase: AdminClient,
  orderId: string,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("meta_capi_sent")
    .select("order_id")
    .eq("order_id", orderId)
    .maybeSingle();

  return Boolean(existing as { order_id: string } | null);
}

async function recordSent(
  supabase: AdminClient,
  orderId: string,
): Promise<void> {
  const { error } = await supabase
    .from("meta_capi_sent")
    .insert({ order_id: orderId });

  if (error && error.code !== "23505") throw error;
}

async function handlePurchase(
  orderId: string,
  req: Request,
): Promise<Response> {
  const pixelId = requireEnv("META_PIXEL_ID");
  const accessToken = requireEnv("META_CONVERSIONS_API_TOKEN");
  const testEventCode = getEnv("META_TEST_EVENT_CODE");
  const siteUrl = getEnv("META_SITE_URL") ?? DEFAULT_SITE_URL;

  const supabase = createAdminClient();

  if (await wasAlreadySent(supabase, orderId)) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "already_sent",
      order_id: orderId,
    });
  }

  const payload = await loadOrderContext(supabase, orderId);
  if (!payload) {
    return jsonResponse(
      { ok: false, error: "order_not_found", order_id: orderId },
      404,
    );
  }

  if (payload.value <= 0 || payload.contentIds.length === 0) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "insufficient_order_data",
      order_id: orderId,
    });
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  const result = await sendMetaPurchaseEvent({
    pixelId,
    accessToken,
    testEventCode,
    siteUrl,
    payload: {
      ...payload,
      clientIp,
      userAgent,
    },
  });

  if (!result.ok) {
    console.error(
      "[meta-conversions] Meta API error",
      result.status,
      result.body,
    );
    return jsonResponse(
      {
        ok: false,
        error: "meta_api_error",
        status: result.status,
        body: result.body,
        order_id: orderId,
      },
      502,
    );
  }

  await recordSent(supabase, orderId);
  console.info("[meta-conversions] Purchase sent", orderId, result.body);

  return jsonResponse({
    ok: true,
    order_id: orderId,
    meta_status: result.status,
    test_mode: Boolean(testEventCode),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const body = await req.json();

    if (body?.order_id && typeof body.order_id === "string") {
      return await handlePurchase(body.order_id, req);
    }

    const webhook = body as DbWebhookPayload;
    if (
      webhook?.type === "INSERT" &&
      webhook?.table === "orders" &&
      webhook?.record?.id
    ) {
      return await handlePurchase(webhook.record.id, req);
    }

    return jsonResponse({ error: "unsupported_payload" }, 400);
  } catch (error) {
    console.error("[meta-conversions]", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
