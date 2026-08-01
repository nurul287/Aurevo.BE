import { Router } from "express";
import {
  chatLimiter,
  optionalAuth,
  publicLimiter,
  validate,
} from "../../middlewares";
import {
  cancelChatOrderHandler,
  chat,
  chatHealth,
  confirmChatOrderHandler,
  prepareChatOrderHandler,
} from "./chat.controller";
import {
  chatMessageSchema,
  chatOrderDraftActionSchema,
  chatPrepareOrderSchema,
} from "./chat.schema";

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
 *           chunks, optional `data: {"products":[...]}`, and optional
 *           `data: {"orderConfirmation":{...}}` when a COD order draft is ready.
 *           Stream ends with `data: [DONE]`.
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
 * /api/chat/orders/prepare:
 *   post:
 *     summary: Prepare a chat COD order draft (same as the prepare_order tool)
 *     description: >
 *       Validates stock/shipping and stores a short-TTL draft. Does not create
 *       an order — the Confirm button / POST /orders/confirm does. Used by the
 *       chat tool and by local e2e tests that mock the LLM stream.
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, items, shippingAddress]
 *     responses:
 *       201:
 *         description: Draft ready for Confirm/Cancel
 *       422:
 *         description: Insufficient stock or business rule
 */
router.post(
  "/orders/prepare",
  optionalAuth,
  chatLimiter,
  validate(chatPrepareOrderSchema),
  prepareChatOrderHandler,
);

/**
 * @swagger
 * /api/chat/orders/confirm:
 *   post:
 *     summary: Confirm a chat COD order draft and create the order
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [draftId, sessionId]
 *             properties:
 *               draftId:
 *                 type: string
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Order created (Cash on Delivery)
 *       403:
 *         description: Draft belongs to a different session or user
 *       404:
 *         description: Draft missing or expired
 */
router.post(
  "/orders/confirm",
  optionalAuth,
  chatLimiter,
  validate(chatOrderDraftActionSchema),
  confirmChatOrderHandler,
);

/**
 * @swagger
 * /api/chat/orders/cancel:
 *   post:
 *     summary: Cancel a chat COD order draft
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [draftId, sessionId]
 *             properties:
 *               draftId:
 *                 type: string
 *               sessionId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Draft cancelled (idempotent if already gone)
 *       403:
 *         description: Draft belongs to a different session or user
 */
router.post(
  "/orders/cancel",
  optionalAuth,
  chatLimiter,
  validate(chatOrderDraftActionSchema),
  cancelChatOrderHandler,
);

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
