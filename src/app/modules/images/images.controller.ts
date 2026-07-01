import { Request, Response, NextFunction } from "express";
import * as ImageService from "./images.service";
import { ValidationError } from "../../errors/AppError";
import type { UpdateImageInput } from "./images.schema";

export const getImages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ImageService.getImages(req.params.productId!);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getImageById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ImageService.getImageById(req.params.productId!, req.params.id!);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const uploadImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const options = {
      altText: req.body.altText,
      variantId: req.body.variantId,
      sortOrder: req.body.sortOrder ? parseInt(req.body.sortOrder) : undefined,
      isPrimary: req.body.isPrimary === true || req.body.isPrimary === "true",
    };

    let data;
    if (req.file) {
      data = await ImageService.uploadImage(req.params.productId!, req.file, options);
    } else if (req.body.url) {
      data = await ImageService.createImageRecord(req.params.productId!, { ...options, url: req.body.url });
    } else {
      throw new ValidationError("Either an image file or a URL is required");
    }

    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ImageService.updateImage(req.params.productId!, req.params.id!, req.body as UpdateImageInput);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const setPrimaryImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await ImageService.setPrimaryImage(req.params.productId!, req.params.id!);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const deleteImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await ImageService.deleteImage(req.params.productId!, req.params.id!);
    res.status(200).json({ success: true, message: "Image deleted successfully" });
  } catch (err) { next(err); }
};
