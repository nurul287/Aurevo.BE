import { Router, type IRouter } from "express";
import { testSendEmail } from "./email-test.controller";

const router: IRouter = Router();

/**
 * @swagger
 * /api/internal/email/test-send:
 *   post:
 *     summary: Send a real order-confirmation email through a synthetic order — no DB write. Diagnostic only, machine-to-machine.
 *     tags: [Internal]
 *     parameters:
 *       - in: header
 *         name: x-internal-task-token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Whether a send was attempted and why not, if skipped
 *       401:
 *         description: Missing/invalid internal task token
 */
router.post("/test-send", testSendEmail);

export default router;
