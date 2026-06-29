import { Router } from "express";
import { authenticate, requireAdmin } from "../../middlewares/auth";
import { getDashboard } from "./admin.controller";

const router = Router();

router.get("/dashboard", authenticate, requireAdmin, getDashboard);

export default router;
