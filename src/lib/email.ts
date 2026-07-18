import { Resend } from "resend";
import { config } from "../app/config";
import { logger } from "./logger";
import { buildInvoicePdfBuffer } from "./invoice-pdf";

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

export type OrderLineItem = {
  productName: string | null;
  variantName: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export type OrderForEmail = {
  id: string;
  email: string | null;
  orderNumber: string;
  // Widened for the invoice PDF (src/lib/invoice-pdf.ts) — all already present
  // on the orders row returned by createOrder / getOrderByNumber, so no extra
  // DB fetch and the single email call site keeps compiling unchanged.
  createdAt: string | Date | null;
  paymentStatus: string | null;
  shippingPhone: string | null;
  notes: string | null;
  subtotal: string | null;
  shippingAmount: string | null;
  totalAmount: string | null;
  shippingName: string | null;
  shippingAddress: unknown;
  // Guest orders carry a token so the confirmation link works without login;
  // logged-in orders have none (owner access is via their session instead).
  guestToken: string | null;
  items: OrderLineItem[];
};

/** Public confirmation-page URL for this order — works for guest and logged-in orders alike. */
function buildConfirmationUrl(order: OrderForEmail): string {
  const params = new URLSearchParams({
    orderId: order.id,
    orderNumber: order.orderNumber,
  });
  if (order.guestToken) params.set("guestToken", order.guestToken);
  return `${config.FRONTEND_URL}/order-confirmation?${params.toString()}`;
}

/** Shared by the email HTML and the invoice PDF so the two never drift. */
export function formatShippingAddressLine(shippingAddress: unknown): string {
  const shipTo = shippingAddress as
    | { address?: string; district?: string; upazila?: string }
    | null
    | undefined;
  return shipTo
    ? [shipTo.address, shipTo.upazila, shipTo.district].filter(Boolean).join(", ")
    : "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderOrderConfirmationHtml(order: OrderForEmail): string {
  const addressLine = formatShippingAddressLine(order.shippingAddress);
  const firstName = (order.shippingName ?? "there").split(" ")[0];
  const confirmationUrl = buildConfirmationUrl(order);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemWord = itemCount === 1 ? "item" : "items";

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
          <h1 style="margin:0 0 8px;font-size:22px;color:#111111;">Thanks for your order, ${escapeHtml(firstName)}!</h1>
          <p style="margin:0;font-size:14px;color:#5a5a5a;">
            Order <strong style="color:#111111;">${escapeHtml(order.orderNumber)}</strong> is confirmed and being prepared.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 0;">
          <table role="presentation" width="100%" style="background:#f9f9f9;border-radius:6px;border-collapse:collapse;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0;font-size:14px;color:#1a1a1a;line-height:1.6;">
                  ${itemCount} ${itemWord} · <strong style="color:#111111;">৳${order.totalAmount}</strong> total
                </p>
                <p style="margin:6px 0 0;font-size:13px;color:#5a5a5a;line-height:1.6;">
                  Your detailed invoice is attached as a PDF.
                </p>
              </td>
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
        <td style="padding:0 32px 32px;text-align:center;">
          <a href="${confirmationUrl}" style="display:inline-block;background:#111111;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:999px;">View your order</a>
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
      "RESEND_API_KEY unset — skipping order confirmation email",
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

  // The send path was previously silent on success — the only way to tell
  // "sent fine" apart from "never ran" was to grep Resend's own dashboard,
  // which made a real production gap (an order with no confirmation email
  // and nothing in the app logs either way) unresolvable from Railway logs
  // alone. Log both the attempt and the outcome explicitly.
  logger.info(
    { orderNumber: order.orderNumber, to: order.email },
    "sending order confirmation email",
  );

  // Attach the invoice PDF. Degrade gracefully: if PDF generation fails, still
  // send the email (a customer getting the confirmation minus the attachment
  // beats getting none — they can also fetch it from the confirmation page).
  let attachments: { filename: string; content: Buffer }[] | undefined;
  try {
    const pdf = await buildInvoicePdfBuffer(order);
    attachments = [{ filename: `invoice-${order.orderNumber}.pdf`, content: pdf }];
  } catch (err) {
    logger.error(
      { err, orderNumber: order.orderNumber },
      "invoice PDF generation failed — sending confirmation email without attachment",
    );
  }

  const { data, error } = await getResend().emails.send({
    from: config.EMAIL_FROM,
    to: order.email,
    subject: `Order confirmed — ${order.orderNumber}`,
    html: renderOrderConfirmationHtml(order),
    ...(attachments ? { attachments } : {}),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  logger.info(
    { orderNumber: order.orderNumber, to: order.email, resendId: data?.id },
    "order confirmation email sent",
  );
}
