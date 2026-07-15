import Anthropic from "@anthropic-ai/sdk";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../../db";
import { conversations, messages } from "../../../db/schema";
import { config } from "../../config";

const HISTORY_WINDOW = 6; // last N turns (user+assistant pairs) sent as raw messages
const SUMMARY_REFRESH_EVERY = 3; // refresh the rolling intent summary every N user turns

let _anthropic: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  return _anthropic;
}

export async function getOrCreateConversation(sessionId: string, userId: string | null) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.sessionId, sessionId));

  if (existing) {
    // A guest session that later logs in gets attached to the account on its next message.
    if (userId && !existing.userId) {
      const [updated] = await db
        .update(conversations)
        .set({ userId })
        .where(eq(conversations.id, existing.id))
        .returning();
      return updated!;
    }
    return existing;
  }

  const [created] = await db
    .insert(conversations)
    .values({ sessionId, userId })
    .returning();
  return created!;
}

export async function loadRecentMessages(conversationId: string): Promise<Anthropic.MessageParam[]> {
  const rows = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(HISTORY_WINDOW * 2);

  return rows.reverse().map((m) => ({ role: m.role, content: m.content }));
}

export async function saveMessage(conversationId: string, role: "user" | "assistant", content: string) {
  if (!content.trim()) return;
  await db.insert(messages).values({ conversationId, role, content });
}

export async function touchConversation(conversationId: string) {
  await db
    .update(conversations)
    .set({ lastActivityAt: new Date().toISOString() })
    .where(eq(conversations.id, conversationId));
}

/**
 * Refreshes the rolling intent summary every SUMMARY_REFRESH_EVERY user turns,
 * via a cheap Haiku call — keeps a long conversation's per-request token cost
 * flat instead of growing with full history length.
 */
export async function maybeRefreshIntentSummary(conversationId: string) {
  const [conv] = await db
    .select({ intentSummary: conversations.intentSummary })
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  if (!conv) return;

  const userTurnCount = await db
    .select({ role: messages.role })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.role, "user")));
  if (userTurnCount.length % SUMMARY_REFRESH_EVERY !== 0) return;

  const recent = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const transcript = recent.map((m) => `${m.role}: ${m.content}`).join("\n");
  const prompt = `Summarize the customer's shopping intent and any relevant context from this conversation in one short sentence (under 25 words). Previous summary: "${conv.intentSummary ?? "none"}".\n\nConversation:\n${transcript}`;

  try {
    const response = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (textBlock) {
      await db
        .update(conversations)
        .set({ intentSummary: textBlock.text.trim() })
        .where(eq(conversations.id, conversationId));
    }
  } catch {
    // Summary refresh is a nice-to-have — never let it break the chat turn.
  }
}
