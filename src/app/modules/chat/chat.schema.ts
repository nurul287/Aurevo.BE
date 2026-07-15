import { z } from "zod";

export const chatMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(2000, "Message must be under 2000 characters"),
    sessionId: z.string().uuid(),
  }),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>["body"];
