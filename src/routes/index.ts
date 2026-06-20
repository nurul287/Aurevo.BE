import { Router, type IRouter } from "express";
import categoryRoutes from "../app/modules/categories/categories.routes";
import brandRoutes from "../app/modules/brands/brands.routes";

const router: IRouter = Router();

router.use("/categories", categoryRoutes);
router.use("/brands", brandRoutes);

// Modules will be registered here as they are built:
// router.use("/brands", brandRoutes);
// router.use("/products", productRoutes);
// router.use("/cart", cartRoutes);
// router.use("/orders", orderRoutes);
// router.use("/inventory", inventoryRoutes);
// router.use("/auth", authRoutes);
// router.use("/chat", chatRoutes);

export default router;
