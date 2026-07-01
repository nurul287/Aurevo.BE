import { Router } from "express";
import { authenticate, requireAdmin, publicLimiter, validate } from "../../middlewares";
import { getAllImagesAdmin } from "./images.controller";
import { getAllImagesAdminSchema } from "./images.schema";

const router = Router();

router.get("/", publicLimiter, authenticate, requireAdmin, validate(getAllImagesAdminSchema), getAllImagesAdmin);

export default router;
