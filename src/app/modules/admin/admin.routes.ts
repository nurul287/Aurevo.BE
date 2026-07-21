import { Router } from "express";
import { authenticate, requireAdmin } from "../../middlewares/auth";
import { getDashboard, getAiMetricsController } from "./admin.controller";

const router: Router = Router();

router.get("/dashboard", authenticate, requireAdmin, getDashboard);
router.get("/ai-metrics", authenticate, requireAdmin, getAiMetricsController);

export default router;
