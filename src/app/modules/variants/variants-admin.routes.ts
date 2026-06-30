import { Router } from "express";
import { authenticate, publicLimiter, requireAdmin } from "../../middlewares";
import { getAllVariants } from "./variants.controller";

// Mounted at /api/variants — flat admin endpoint for listing all variants with product info
const router: Router = Router();

router.get("/", publicLimiter, authenticate, requireAdmin, getAllVariants);

export default router;
