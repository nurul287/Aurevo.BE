import crypto from "crypto";

/** Short-lived in-memory drafts for chat COD confirm — same pattern as OAuth exchange codes. */
const DRAFT_TTL_MS = 20 * 60 * 1000; // 20 minutes

export type ChatOrderDraftItem = {
  variantId: string;
  quantity: number;
  productName: string;
  variantName: string | null;
  unitPrice: string;
  lineTotal: string;
};

export type ChatOrderDraftAddress = {
  name: string;
  phone: string;
  address: string;
  district: string;
  upazila: string;
};

export type ChatOrderDraft = {
  draftId: string;
  createdAt: number;
  sessionId: string;
  conversationId: string;
  userId: string | null;
  items: ChatOrderDraftItem[];
  shippingAddress: ChatOrderDraftAddress;
  email: string | null;
  phone: string | null;
  notes: string | null;
  subtotal: string;
  shippingAmount: string;
  totalAmount: string;
  paymentMethod: "cash";
};

const drafts = new Map<string, ChatOrderDraft>();

function sweepExpired(): void {
  const now = Date.now();
  for (const [id, draft] of drafts) {
    if (now - draft.createdAt > DRAFT_TTL_MS) drafts.delete(id);
  }
}

setInterval(sweepExpired, 5 * 60 * 1000).unref?.();

export function storeOrderDraft(
  input: Omit<ChatOrderDraft, "draftId" | "createdAt" | "paymentMethod">,
): ChatOrderDraft {
  sweepExpired();
  const draft: ChatOrderDraft = {
    ...input,
    draftId: crypto.randomBytes(16).toString("hex"),
    createdAt: Date.now(),
    paymentMethod: "cash",
  };
  drafts.set(draft.draftId, draft);
  return draft;
}

export function getOrderDraft(draftId: string): ChatOrderDraft | null {
  sweepExpired();
  const draft = drafts.get(draftId);
  if (!draft) return null;
  if (Date.now() - draft.createdAt > DRAFT_TTL_MS) {
    drafts.delete(draftId);
    return null;
  }
  return draft;
}

export function deleteOrderDraft(draftId: string): boolean {
  return drafts.delete(draftId);
}

/** Re-insert a draft under its original id after a failed confirm (retry). */
export function setOrderDraftForRestore(draft: ChatOrderDraft): void {
  drafts.set(draft.draftId, draft);
}

/** Test helper — clears all drafts between cases. */
export function clearOrderDraftsForTests(): void {
  drafts.clear();
}

/** Public shape sent over SSE / returned to the FE confirmation card. */
export function toPublicOrderDraft(draft: ChatOrderDraft) {
  return {
    draftId: draft.draftId,
    items: draft.items,
    shippingAddress: draft.shippingAddress,
    email: draft.email,
    subtotal: draft.subtotal,
    shippingAmount: draft.shippingAmount,
    totalAmount: draft.totalAmount,
    paymentMethod: draft.paymentMethod,
  };
}
