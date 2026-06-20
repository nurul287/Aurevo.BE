import { Request, Response, NextFunction } from "express";
import { streamChat } from "./chat.service";
import type { ChatMessageInput } from "./chat.schema";

export const chat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { message } = req.body as ChatMessageInput;

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    for await (const chunk of streamChat(message)) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    // If headers already sent, can't use globalErrorHandler
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
