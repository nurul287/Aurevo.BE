import { Request, Response, NextFunction } from "express";
import * as InventoryService from "./inventory.service";
import type { GetInventoryInput, UpsertInventoryInput, AdjustInventoryInput, GetMovementsInput, GetLowStockInput, ExportInventoryInput } from "./inventory.schema";
import { buildXlsxBuffer, timestampForFilename } from "../../../lib/xlsx-export";

export const getInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await InventoryService.getInventory(req.query as unknown as GetInventoryInput);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getInventoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await InventoryService.getInventoryById(req.params.id!);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const upsertInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await InventoryService.upsertInventory(req.body as UpsertInventoryInput);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const adjustInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await InventoryService.adjustInventory(req.params.id!, req.body as AdjustInventoryInput, req.user?.id);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getLowStockAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await InventoryService.getLowStockAlerts(req.query as unknown as GetLowStockInput);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await InventoryService.getMovements(req.query as unknown as GetMovementsInput);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getVariantAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ids = [req.query["variantIds"]].flat().filter(Boolean) as string[];
    const data = await InventoryService.getVariantAvailability(ids);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const exportInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, search, movementType } = req.query as unknown as ExportInventoryInput;

    let rows: Record<string, unknown>[];
    let sheetName: string;
    let filePrefix: string;

    if (type === "low-stock") {
      const data = await InventoryService.getAllLowStockAlerts();
      sheetName = "Low Stock";
      filePrefix = "low-stock-items";
      rows = data.map((r) => ({
        Product: r.productVariants?.products?.name ?? "",
        Variant: r.productVariants?.name ?? "",
        "Current Stock": r.quantity,
        Threshold: r.productVariants?.products?.lowStockThreshold ?? 0,
        "Reorder Point": r.reorderPoint,
        "Reorder Quantity": r.reorderQuantity,
      }));
    } else if (type === "movements") {
      const data = await InventoryService.exportMovements({ movementType, search });
      sheetName = "Stock Movements";
      filePrefix = "stock-movements";
      rows = data.map((m) => ({
        Date: m.createdAt ? new Date(m.createdAt).toLocaleString() : "",
        Product: m.productVariants?.products?.name ?? "",
        Variant: m.productVariants?.name ?? "",
        Type: m.movementType,
        Quantity: m.quantity,
        Previous: m.previousQuantity,
        New: m.newQuantity,
        Reference: m.referenceNumber ?? "",
        Notes: m.notes ?? "",
      }));
    } else {
      const data = await InventoryService.exportInventoryLevels({ search });
      sheetName = "Inventory Levels";
      filePrefix = "inventory-levels";
      rows = data.map((item) => ({
        Product: item.productVariants.products.name,
        Variant: item.productVariants.name,
        SKU: item.productVariants.sku,
        Stock: item.quantity,
        Reserved: item.reservedQuantity,
        Available: item.availableQuantity,
        Status:
          item.quantity === 0
            ? "Out of Stock"
            : item.quantity <= (item.productVariants.products.lowStockThreshold ?? 0)
              ? "Low Stock"
              : "In Stock",
      }));
    }

    const buffer = buildXlsxBuffer(sheetName, rows);
    const filename = `${filePrefix}_${timestampForFilename()}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) { next(err); }
};
