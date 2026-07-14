import { Resend } from "resend";
import { config } from "../app/config";
import { logger } from "./logger";

/**
 * Order confirmation email. No-op unless RESEND_API_KEY is set (Railway
 * prod) — local dev and CI send nothing, same convention as sentry.ts.
 */
export const emailEnabled = () => Boolean(config.RESEND_API_KEY);

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(config.RESEND_API_KEY);
  }
  return _resend;
}

type OrderLineItem = {
  productName: string | null;
  variantName: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

type OrderForEmail = {
  email: string | null;
  orderNumber: string;
  subtotal: string | null;
  shippingAmount: string | null;
  totalAmount: string | null;
  shippingName: string | null;
  shippingAddress: unknown;
  items: OrderLineItem[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderOrderConfirmationHtml(order: OrderForEmail): string {
  const shipTo = order.shippingAddress as
    | { address?: string; district?: string; upazila?: string }
    | null
    | undefined;
  const addressLine = shipTo
    ? [shipTo.address, shipTo.upazila, shipTo.district].filter(Boolean).join(", ")
    : "";
  const firstName = (order.shippingName ?? "there").split(" ")[0];

  const rows = order.items
    .map((item, i) => {
      const label = [item.productName, item.variantName].filter(Boolean).join(" — ");
      const zebra = i % 2 === 1 ? "background:#fafafa;" : "";
      return `
      <tr>
        <td style="padding:14px 12px;${zebra}border-bottom:1px solid #ececec;font-size:14px;color:#1a1a1a;">
          ${escapeHtml(label)}
          ${item.sku ? `<div style="font-size:12px;color:#8a8a8a;margin-top:2px;">SKU: ${escapeHtml(item.sku)}</div>` : ""}
        </td>
        <td style="padding:14px 12px;${zebra}border-bottom:1px solid #ececec;font-size:14px;color:#1a1a1a;text-align:center;">${item.quantity}</td>
        <td style="padding:14px 12px;${zebra}border-bottom:1px solid #ececec;font-size:14px;color:#1a1a1a;text-align:right;white-space:nowrap;">৳${item.totalPrice}</td>
      </tr>`;
    })
    .join("");

  return `
  <div style="background:#f4f4f4;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border-collapse:collapse;">
      <tr>
        <td style="background:#111111;padding:24px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="width:34px;vertical-align:middle;"><img src="https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/Logo/aurevoLogoWhite.png" width="34" height="32" alt="Aurevo Fashion" style="display:block;"></td>
            <td style="text-align:center;vertical-align:middle;"><span style="color:#ffffff;font-size:20px;font-weight:600;letter-spacing:0.5px;">AUREVO FASHION</span></td>
            <td style="width:34px;"></td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 8px;">
          <p style="margin:0 0 4px;font-size:13px;color:#8a8a8a;text-transform:uppercase;letter-spacing:1px;">Order Confirmed</p>
          <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Thanks for your order, ${escapeHtml(firstName)}!</h1>
          <p style="margin:0;font-size:14px;color:#5a5a5a;">
            Order <strong style="color:#111111;">${escapeHtml(order.orderNumber)}</strong> is confirmed and being prepared.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 0;">
          <table role="presentation" width="100%" style="border-collapse:collapse;">
            <thead>
              <tr>
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#8a8a8a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #111111;">Item</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#8a8a8a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #111111;">Qty</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;color:#8a8a8a;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #111111;">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;">
          <table role="presentation" width="100%" style="border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#5a5a5a;">Subtotal</td>
              <td style="padding:4px 0;font-size:14px;color:#5a5a5a;text-align:right;">৳${order.subtotal}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:14px;color:#5a5a5a;">Shipping</td>
              <td style="padding:4px 0;font-size:14px;color:#5a5a5a;text-align:right;">৳${order.shippingAmount}</td>
            </tr>
            <tr>
              <td style="padding:10px 0 0;font-size:16px;color:#111111;font-weight:600;border-top:1px solid #ececec;">Total</td>
              <td style="padding:10px 0 0;font-size:16px;color:#111111;font-weight:600;text-align:right;border-top:1px solid #ececec;">৳${order.totalAmount}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 32px;">
          <table role="presentation" width="100%" style="background:#f9f9f9;border-radius:6px;border-collapse:collapse;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0 0 4px;font-size:12px;color:#8a8a8a;text-transform:uppercase;letter-spacing:0.5px;">Shipping To</p>
                <p style="margin:0;font-size:14px;color:#1a1a1a;">${escapeHtml(order.shippingName ?? "")}</p>
                <p style="margin:2px 0 0;font-size:14px;color:#5a5a5a;">${escapeHtml(addressLine)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #ececec;">
          <p style="margin:0;font-size:12px;color:#a0a0a0;">
            Questions about your order? Just reply to this email — we're happy to help.
          </p>
        </td>
      </tr>
    </table>
  </div>`;
}

export async function sendOrderConfirmationEmail(
  order: OrderForEmail,
): Promise<void> {
  if (!emailEnabled()) {
    logger.info(
      { orderNumber: order.orderNumber },
      "GMAIL_APP_PASSWORD unset — skipping order confirmation email",
    );
    return;
  }

  if (!order.email) {
    logger.warn(
      { orderNumber: order.orderNumber },
      "order has no email — skipping order confirmation email",
    );
    return;
  }

  const { error } = await getResend().emails.send({
    from: config.EMAIL_FROM,
    to: order.email,
    subject: `Order confirmed — ${order.orderNumber}`,
    html: renderOrderConfirmationHtml(order),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
