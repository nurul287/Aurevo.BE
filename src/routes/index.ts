import { Router, type IRouter } from "express";
import adminRoutes from "../app/modules/admin/admin.routes";
import authRoutes from "../app/modules/auth/auth.routes";
import brandRoutes from "../app/modules/brands/brands.routes";
import cartRoutes from "../app/modules/cart/cart.routes";
import categoryRoutes from "../app/modules/categories/categories.routes";
import chatRoutes from "../app/modules/chat/chat.routes";
import imageRoutes from "../app/modules/images/images.routes";
import inventoryRoutes from "../app/modules/inventory/inventory.routes";
import orderRoutes from "../app/modules/orders/orders.routes";
import productRoutes from "../app/modules/products/products.routes";
import variantRoutes from "../app/modules/variants/variants.routes";

const router: IRouter = Router();

router.use("/categories", categoryRoutes);
router.use("/brands", brandRoutes);
router.use("/products", productRoutes);
router.use("/products/:productId/variants", variantRoutes);
router.use("/products/:productId/images", imageRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/chat", chatRoutes);

export default router;
