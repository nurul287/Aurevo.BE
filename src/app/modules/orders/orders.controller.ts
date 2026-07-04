import { Request, Response, NextFunction } from "express";
import * as OrderService from "./orders.service";
import type {
  CreateOrderInput,
  GetOrdersInput,
  UpdateStatusInput,
  UpdatePaymentStatusInput,
  UpdateTrackingInput,
  UpdateFulfillmentInput,
} from "./orders.schema";

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await OrderService.createOrder(
      req.body as CreateOrderInput,
      req.user?.id,
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await OrderService.getOrders(
      req.query as unknown as GetOrdersInput,
      req.user!,
    );
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const guestToken = req.query.guestToken as string | undefined;
    const data = await OrderService.getOrderById(
      req.params.id!,
      req.user,
      guestToken,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getOrderByNumber = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const guestToken = req.query.guestToken as string | undefined;
    const data = await OrderService.getOrderByNumber(
      req.params.orderNumber!,
      req.user,
      guestToken,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await OrderService.cancelOrder(req.params.id!, req.user!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await OrderService.deleteOrder(req.params.id!);
    res.status(200).json({ success: true, message: "Order deleted" });
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await OrderService.updateStatus(
      req.params.id!,
      req.body as UpdateStatusInput,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updatePaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await OrderService.updatePaymentStatus(
      req.params.id!,
      req.body as UpdatePaymentStatusInput,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateTracking = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await OrderService.updateTracking(
      req.params.id!,
      req.body as UpdateTrackingInput,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateFulfillment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await OrderService.updateFulfillment(
      req.params.id!,
      req.body as UpdateFulfillmentInput,
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getOrderStats = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await OrderService.getOrderStats();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const claimOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    const result = await OrderService.claimGuestOrders(
      req.user!.id,
      req.user!.email,
      sessionId,
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
