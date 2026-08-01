import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import {
  cancelChatOrder,
  confirmChatOrder,
  prepareChatOrder,
} from "./chat.orders.service";
import { streamChat } from "./chat.service";
import type {
  ChatMessageInput,
  ChatOrderDraftActionInput,
  ChatPrepareOrderInput,
} from "./chat.schema";

export const chat = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { message, sessionId } = req.body as ChatMessageInput;
    const userId = req.user?.id ?? null;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    for await (const event of streamChat(message, sessionId, userId)) {
      if (event.type === "conversation") {
        res.write(
          `data: ${JSON.stringify({ conversationId: event.conversationId })}\n\n`,
        );
      } else if (event.type === "thinking") {
        res.write(`data: ${JSON.stringify({ status: "thinking" })}\n\n`);
      } else if (event.type === "text") {
        res.write(`data: ${JSON.stringify({ text: event.text })}\n\n`);
      } else if (event.type === "products") {
        res.write(`data: ${JSON.stringify({ products: event.products })}\n\n`);
      } else if (event.type === "order_confirmation") {
        res.write(
          `data: ${JSON.stringify({ orderConfirmation: event.draft })}\n\n`,
        );
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      next(err);
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
};

export const prepareChatOrderHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body as ChatPrepareOrderInput;
    const userId = req.user?.id ?? null;
    const data = await prepareChatOrder(
      {
        items: body.items,
        shippingAddress: body.shippingAddress,
        email: body.email,
        phone: body.phone,
        notes: body.notes,
      },
      {
        sessionId: body.sessionId,
        conversationId: body.conversationId ?? crypto.randomUUID(),
        userId,
      },
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const confirmChatOrderHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { draftId, sessionId } = req.body as ChatOrderDraftActionInput;
    const userId = req.user?.id ?? null;
    const data = await confirmChatOrder(draftId, sessionId, userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const cancelChatOrderHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { draftId, sessionId } = req.body as ChatOrderDraftActionInput;
    const userId = req.user?.id ?? null;
    cancelChatOrder(draftId, sessionId, userId);
    res.status(200).json({ success: true, data: { cancelled: true } });
  } catch (err) {
    next(err);
  }
};

export const chatHealth = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  res
    .status(200)
    .json({
      success: true,
      data: {
        model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
        status: "ready",
      },
    });
};
