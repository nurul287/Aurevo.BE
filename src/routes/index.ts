import { Router, type IRouter } from "express";
import categoryRoutes from "../app/modules/categories/categories.routes";
import brandRoutes from "../app/modules/brands/brands.routes";
import productRoutes from "../app/modules/products/products.routes";
import variantRoutes from "../app/modules/variants/variants.routes";

const router: IRouter = Router();

router.use("/categories", categoryRoutes);
router.use("/brands", brandRoutes);
router.use("/products", productRoutes);
// Variants are nested — productRoutes mounts them via mergeParams
router.use("/products/:productId/variants", variantRoutes);

// Modules will be registered here as they are built:
// router.use("/brands", brandRoutes);
// router.use("/products", productRoutes);
// router.use("/cart", cartRoutes);
// router.use("/orders", orderRoutes);
// router.use("/inventory", inventoryRoutes);
// router.use("/auth", authRoutes);
// router.use("/chat", chatRoutes);

export default router;
