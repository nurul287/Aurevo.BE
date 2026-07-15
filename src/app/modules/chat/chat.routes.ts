import { Router } from "express";
import {
  chatLimiter,
  optionalAuth,
  publicLimiter,
  validate,
} from "../../middlewares";
import { chat, chatHealth } from "./chat.controller";
import { chatMessageSchema } from "./chat.schema";

const router: Router = Router();

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send a message to the AI shopping assistant (SSE streaming)
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message, sessionId]
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *                 description: Client-generated, persisted in localStorage — keys the conversation for history/retention.
 *     responses:
 *       200:
 *         description: >
 *           SSE stream. First event is `data: {"conversationId":"..."}`, then zero or more
 *           `data: {"status":"thinking"}` events during tool calls, then `data: {"text":"..."}`
 *           chunks. Stream ends with `data: [DONE]`.
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       429:
 *         description: Rate limit exceeded (10 messages/minute)
 */
router.post("/", optionalAuth, chatLimiter, validate(chatMessageSchema), chat);

/**
 * @swagger
 * /api/chat/health:
 *   get:
 *     summary: Check AI chat service status
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Model name and status
 */
router.get("/health", publicLimiter, chatHealth);

export default router;
