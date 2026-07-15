import { Request, Response, NextFunction } from "express";
import { streamChat } from "./chat.service";
import type { ChatMessageInput } from "./chat.schema";

export const chat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        res.write(`data: ${JSON.stringify({ conversationId: event.conversationId })}\n\n`);
      } else if (event.type === "thinking") {
        res.write(`data: ${JSON.stringify({ status: "thinking" })}\n\n`);
      } else if (event.type === "text") {
        res.write(`data: ${JSON.stringify({ text: event.text })}\n\n`);
      } else if (event.type === "products") {
        res.write(`data: ${JSON.stringify({ products: event.products })}\n\n`);
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

export const chatHealth = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001", status: "ready" } });
};
