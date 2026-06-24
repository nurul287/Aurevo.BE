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
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: SSE stream of text chunks. Each event is `data: {"text":"..."}`. Stream ends with `data: [DONE]`
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
