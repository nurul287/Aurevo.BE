import { Router, type IRouter } from "express";
import { pollCourierStatus } from "./courier.internal.controller";

const router: IRouter = Router();

/**
 * @swagger
 * /api/internal/courier/poll:
 *   post:
 *     summary: Reconciliation poll for in-flight courier shipments. Machine-to-machine only.
 *     tags: [Internal]
 *     parameters:
 *       - in: header
 *         name: x-internal-task-token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Number of orders updated
 *       401:
 *         description: Missing/invalid internal task token
 */
router.post("/poll", pollCourierStatus);

export default router;
