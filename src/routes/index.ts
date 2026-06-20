import { Router, type IRouter } from "express";
import categoryRoutes from "../app/modules/categories/categories.routes";
import brandRoutes from "../app/modules/brands/brands.routes";
import productRoutes from "../app/modules/products/products.routes";
import variantRoutes from "../app/modules/variants/variants.routes";
import imageRoutes from "../app/modules/images/images.routes";
import cartRoutes from "../app/modules/cart/cart.routes";
import orderRoutes from "../app/modules/orders/orders.routes";
import inventoryRoutes from "../app/modules/inventory/inventory.routes";

const router: IRouter = Router();

router.use("/categories", categoryRoutes);
router.use("/brands", brandRoutes);
router.use("/products", productRoutes);
router.use("/products/:productId/variants", variantRoutes);
router.use("/products/:productId/images", imageRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/inventory", inventoryRoutes);

// Modules will be registered here as they are built:
// router.use("/brands", brandRoutes);
// router.use("/products", productRoutes);
// router.use("/cart", cartRoutes);
// router.use("/orders", orderRoutes);
// router.use("/inventory", inventoryRoutes);
// router.use("/auth", authRoutes);
// router.use("/chat", chatRoutes);

export default router;
