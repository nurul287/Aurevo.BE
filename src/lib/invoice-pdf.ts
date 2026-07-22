import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import SVGtoPDF = require("svg-to-pdfkit");
import { config } from "../app/config";
import { logger } from "./logger";
import { formatShippingAddressLine, type OrderForEmail } from "./email";

/**
 * Order invoice PDF, generated with pdfkit (no headless browser — keeps the
 * Railway image light). Mirrors xlsx-export.ts's "pure buffer builder" shape:
 * pdfkit streams, so we collect chunks and resolve a Buffer on "end".
 *
 * Reuses OrderForEmail's shape (widened in email.ts) rather than a parallel
 * type, minus guestToken — that field is email-link-only (buildConfirmationUrl)
 * and getOrderByNumber deliberately strips it before the invoice route ever
 * sees the order (see stripSensitiveFields in orders.service.ts), so requiring
 * it here would break the public invoice endpoint.
 */
export type OrderForInvoice = Omit<OrderForEmail, "guestToken">;

// A Bangladesh store: shippingName / address / notes are free-text and can
// contain Bengali script, which pdfkit's built-in Helvetica cannot render.
// Noto Sans Bengali (Latin + Bengali) is bundled and used for ALL text so both
// scripts render uniformly without per-string detection. STATIC Regular/Bold
// TTFs are used, not the variable font — fontkit's glyph subsetting corrupts
// variable-font (gvar) glyphs and throws inside doc.end().
// Resolved from cwd (the project root at runtime), same convention as
// knowledge.service.ts's content/policies — tsc does not copy it into dist/.
const FONTS_DIR = path.resolve(process.cwd(), "assets/fonts");
const FONT_REGULAR = path.join(FONTS_DIR, "NotoSansBengali-Regular.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "NotoSansBengali-Bold.ttf");

// Same wordmark asset as Aurevo.UI's public/aurevoLogoBlack.svg — copied in
// (not shared across repos), drawn directly as vectors via svg-to-pdfkit so
// it stays crisp at print resolution (no PNG rasterization step).
const LOGO_PATH = path.join(process.cwd(), "assets/logo/aurevo-logo-black.svg");
// Source viewBox is 86x80 — used to keep the logo's aspect ratio at any render width.
const LOGO_ASPECT_RATIO = 80 / 86;

// Lazy + fault-tolerant: this used to be a top-level `readFileSync`, which
// means a missing/misconfigured deploy image (assets/ not copied into the
// production stage — see the Dockerfile fix) crashed the entire server on
// require(), not just invoice generation. A decorative logo must never be
// able to take down the whole API. `undefined` = not yet attempted,
// `null` = attempted and failed (cached so we don't retry every invoice).
let logoSvgCache: string | null | undefined;
function getLogoSvg(): string | null {
  if (logoSvgCache !== undefined) return logoSvgCache;
  try {
    logoSvgCache = fs.readFileSync(LOGO_PATH, "utf8");
  } catch (err) {
    logger.error({ err, path: LOGO_PATH }, "invoice-pdf: logo SVG unavailable, rendering without it");
    logoSvgCache = null;
  }
  return logoSvgCache;
}

const BUSINESS_DOMAIN = "aurevofashion.store";
const BUSINESS_LOCATION = "Mirpur, Dhaka, Bangladesh";

// Page geometry (A4, margin 40).
const LEFT = 40;
const RIGHT = 555;
const CONTENT_WIDTH = RIGHT - LEFT;

const GRAY = "#666666";
const LIGHT = "#999999";
const RULE = "#dddddd";
const DARK = "#111111";

/** `Aurevo Fashion <orders@aurevofashion.store>` -> `orders@aurevofashion.store`. */
export function extractEmailAddress(raw: string): string {
  const match = raw.match(/<(.+)>/);
  return (match ? match[1]! : raw).trim();
}

/** Plain `990.00` style (no currency symbol), matching the sample invoice. */
export function formatAmount(value: string | number | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return (Number.isFinite(n) ? (n as number) : 0).toFixed(2);
}

/**
 * There is no partial-payment tracking — paid/due is derived from paymentStatus:
 * a paid order shows the full total as paid, anything else shows it all as due.
 */
export function deriveInvoicePayment(
  paymentStatus: string | null,
  totalAmount: string | null,
): { paid: string; due: string } {
  const total = formatAmount(totalAmount);
  return paymentStatus === "paid"
    ? { paid: total, due: "0.00" }
    : { paid: "0.00", due: total };
}

function formatInvoiceDate(value: string | Date | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Doc = PDFKit.PDFDocument;

const TABLE = {
  product: LEFT,
  productW: 300,
  qty: 340,
  qtyW: 60,
  price: 400,
  priceW: 70,
  total: 475,
  totalW: 80,
};

function drawItemsHeader(doc: Doc, y: number): number {
  doc.font("BodyBold").fontSize(9).fillColor(GRAY);
  doc.text("PRODUCT", TABLE.product, y, { width: TABLE.productW });
  doc.text("QTY", TABLE.qty, y, { width: TABLE.qtyW, align: "center" });
  doc.text("PRICE", TABLE.price, y, { width: TABLE.priceW, align: "right" });
  doc.text("TOTAL", TABLE.total, y, { width: TABLE.totalW, align: "right" });
  const lineY = y + 16;
  doc.moveTo(LEFT, lineY).lineTo(RIGHT, lineY).strokeColor(DARK).lineWidth(1).stroke();
  return lineY + 8;
}

// Right-side label/value column (invoice meta + totals blocks). Ends flush
// with RIGHT; starts with a gap after the left (BILL TO) column, which is
// capped at LEFT_COLUMN_W below.
const META_LABEL_X = 300;
const META_LABEL_W = 115;
const META_VALUE_X = 425;
const META_VALUE_W = 130;
const LEFT_COLUMN_W = 240;

/**
 * Right-aligned label + bold value row. Unlike a fixed row-height grid, this
 * MEASURES the actual rendered height (via heightOfString) before drawing, so
 * a wrapped value (a long date, "Cash on Delivery", etc.) never overlaps the
 * next row — it just makes that one row taller. Returns the y for the next row.
 */
function metaRow(
  doc: Doc,
  label: string,
  value: string,
  y: number,
  opts: { boldValue?: boolean; size?: number } = {},
): number {
  const size = opts.size ?? 10;

  doc.font("Body").fontSize(size);
  const labelH = doc.heightOfString(label, { width: META_LABEL_W });
  doc.font(opts.boldValue ? "BodyBold" : "Body").fontSize(size);
  const valueH = doc.heightOfString(value, { width: META_VALUE_W });
  const rowH = Math.max(labelH, valueH);

  doc.font("Body").fontSize(size).fillColor(GRAY)
    .text(label, META_LABEL_X, y, { width: META_LABEL_W, align: "right" });
  doc.font(opts.boldValue ? "BodyBold" : "Body").fontSize(size).fillColor(DARK)
    .text(value, META_VALUE_X, y, { width: META_VALUE_W, align: "right" });

  return y + rowH + 6;
}

function renderInvoice(doc: Doc, order: OrderForInvoice): void {
  const businessEmail = extractEmailAddress(config.EMAIL_FROM);
  const { paid, due } = deriveInvoicePayment(order.paymentStatus, order.totalAmount);

  // --- Header: logo left, INVOICE right ---
  const logoWidth = 42;
  const logoSvg = getLogoSvg();
  if (logoSvg) {
    SVGtoPDF(doc, logoSvg, LEFT, 40, { width: logoWidth, height: logoWidth * LOGO_ASPECT_RATIO });
  }
  doc.font("BodyBold").fontSize(22).fillColor(DARK)
    .text("INVOICE", LEFT, 42, { width: CONTENT_WIDTH, align: "right" });

  // Business contact block (right-aligned, gray, under INVOICE) — no phone number.
  doc.font("Body").fontSize(9).fillColor(GRAY);
  doc.text(BUSINESS_DOMAIN, LEFT, 72, { width: CONTENT_WIDTH, align: "right" });
  doc.text(businessEmail, LEFT, 84, { width: CONTENT_WIDTH, align: "right" });
  doc.text(BUSINESS_LOCATION, LEFT, 96, {
    width: CONTENT_WIDTH,
    align: "right",
  });

  doc.moveTo(LEFT, 120).lineTo(RIGHT, 120).strokeColor(RULE).lineWidth(1).stroke();

  // --- BILL TO (left) + invoice meta (right) ---
  const blockTop = 138;
  doc.font("BodyBold").fontSize(9).fillColor(GRAY).text("BILL TO", LEFT, blockTop);
  doc.font("BodyBold").fontSize(12).fillColor(DARK)
    .text(order.shippingName ?? "—", LEFT, blockTop + 14, { width: LEFT_COLUMN_W });
  doc.font("Body").fontSize(10).fillColor(GRAY);
  if (order.shippingPhone) doc.text(order.shippingPhone, LEFT, doc.y + 2, { width: LEFT_COLUMN_W });
  const addressLine = formatShippingAddressLine(order.shippingAddress);
  if (addressLine) doc.text(addressLine, LEFT, doc.y + 2, { width: LEFT_COLUMN_W });
  const leftEndY = doc.y;

  let metaY = blockTop;
  metaY = metaRow(doc, "Invoice Number:", order.orderNumber, metaY, { boldValue: true });
  metaY = metaRow(doc, "Invoice Date:", formatInvoiceDate(order.createdAt), metaY, {
    boldValue: true,
  });
  metaY = metaRow(
    doc,
    "Payment:",
    order.paymentStatus === "paid" ? "Paid" : "Cash on Delivery",
    metaY,
    { boldValue: true },
  );
  metaY = metaRow(doc, "Amount Due:", due, metaY, { boldValue: true });
  const rightEndY = metaY;

  // --- Items table ---
  let y = Math.max(leftEndY, rightEndY) + 24;
  y = drawItemsHeader(doc, y);

  for (const item of order.items) {
    // Page-break guard — many-item orders would otherwise overflow A4.
    if (y > 720) {
      doc.addPage();
      y = drawItemsHeader(doc, 50);
    }

    const nameY = y;
    doc.font("BodyBold").fontSize(10).fillColor(DARK)
      .text(item.productName ?? "—", TABLE.product, nameY, { width: TABLE.productW });
    let rowBottom = doc.y;
    if (item.variantName) {
      doc.font("Body").fontSize(8).fillColor(LIGHT)
        .text(item.variantName, TABLE.product, doc.y + 1, { width: TABLE.productW });
      rowBottom = doc.y;
    }

    doc.font("Body").fontSize(10).fillColor(DARK);
    doc.text(String(item.quantity), TABLE.qty, nameY, { width: TABLE.qtyW, align: "center" });
    doc.text(formatAmount(item.unitPrice), TABLE.price, nameY, {
      width: TABLE.priceW,
      align: "right",
    });
    doc.text(formatAmount(item.totalPrice), TABLE.total, nameY, {
      width: TABLE.totalW,
      align: "right",
    });

    y = rowBottom + 8;
    doc.moveTo(LEFT, y - 2).lineTo(RIGHT, y - 2).strokeColor(RULE).lineWidth(0.5).stroke();
  }

  // --- Totals ---
  let totalsY = y + 8;
  totalsY = metaRow(doc, "Cart Total:", formatAmount(order.subtotal), totalsY);
  totalsY = metaRow(doc, "Shipping Charge:", formatAmount(order.shippingAmount), totalsY);
  totalsY = metaRow(doc, "Total:", formatAmount(order.totalAmount), totalsY, {
    boldValue: true,
    size: 12,
  });
  totalsY = metaRow(doc, "Paid Amount:", paid, totalsY);
  totalsY = metaRow(doc, "Due Amount:", due, totalsY);

  // --- Notes (only if present) ---
  if (order.notes) {
    doc.font("Body").fontSize(9).fillColor(GRAY)
      .text(`Notes: ${order.notes}`, LEFT, totalsY + 10, { width: CONTENT_WIDTH });
  }
}

export async function buildInvoicePdfBuffer(order: OrderForInvoice): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Register once per document.
      doc.registerFont("Body", FONT_REGULAR);
      doc.registerFont("BodyBold", FONT_BOLD);

      renderInvoice(doc, order);
      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
