import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { config } from "../../config";
import { UnauthorizedError, ValidationError } from "../../errors";
import { emailEnabled, sendOrderConfirmationEmail } from "../../../lib/email";

const testSendSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

/**
 * Fires a real order-confirmation email through the exact same code path
 * production orders use, with a synthetic order — no DB write, no real
 * order/stock touched. Exists purely to isolate "is Resend/domain config
 * broken in this environment" from "did this specific order fail" without
 * ever placing a real order against production.
 */
export const testSendEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.headers["x-internal-task-token"];
    if (token !== config.INTERNAL_TASK_TOKEN) {
      throw new UnauthorizedError("Invalid internal task token");
    }

    const parsed = testSendSchema.safeParse({ body: req.body });
    if (!parsed.success) {
      throw new ValidationError("email is required", parsed.error.flatten().fieldErrors);
    }

    if (!emailEnabled()) {
      res.status(200).json({
        success: true,
        data: { sent: false, reason: "RESEND_API_KEY unset in this environment" },
      });
      return;
    }

    const orderNumber = `TEST-${Date.now()}`;
    await sendOrderConfirmationEmail({
      email: parsed.data.body.email,
      orderNumber,
      subtotal: "100.00",
      shippingAmount: "0.00",
      totalAmount: "100.00",
      shippingName: "Test Send",
      shippingAddress: { address: "Test address", district: "Dhaka", upazila: "Dhamrai" },
      items: [
        {
          productName: "Internal test product",
          variantName: null,
          sku: "TEST-SKU",
          quantity: 1,
          unitPrice: "100.00",
          totalPrice: "100.00",
        },
      ],
    });

    res.status(200).json({ success: true, data: { sent: true, orderNumber } });
  } catch (err) {
    next(err);
  }
};
