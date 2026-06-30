import { Router } from "express";
import { authenticate, publicLimiter, requireAdmin } from "../../middlewares";
import { validate } from "../../middlewares/validateRequest";
import { getAllVariants } from "./variants.controller";
import { getAllVariantsSchema } from "./variants.schema";

// Mounted at /api/variants — flat admin endpoint for listing all variants with product info
const router: Router = Router();

router.get("/", publicLimiter, authenticate, requireAdmin, validate(getAllVariantsSchema), getAllVariants);

export default router;
