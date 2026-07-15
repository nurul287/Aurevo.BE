import { Router, type IRouter } from "express";
import { cleanupChatHistory } from "./chat.internal.controller";

const router: IRouter = Router();

/**
 * @swagger
 * /api/internal/chat/cleanup:
 *   post:
 *     summary: Delete stale chat history (guests after 48h, users after 90d). Machine-to-machine only.
 *     tags: [Internal]
 *     parameters:
 *       - in: header
 *         name: x-internal-task-token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Number of conversations deleted
 *       401:
 *         description: Missing/invalid internal task token
 */
router.post("/cleanup", cleanupChatHistory);

export default router;
