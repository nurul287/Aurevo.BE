import { v4 as uuidv4 } from "uuid";

/**
 * Generate a unique guest session ID
 */
export const generateGuestSessionId = (): string => {
  return uuidv4();
};

/**
 * Generate a slug from a string
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Generate a unique SKU
 */
export const generateSku = (prefix: string = "SKU"): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Calculate pagination offset
 */
export const calculateOffset = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

/**
 * Calculate total pages
 */
export const calculateTotalPages = (total: number, limit: number): number => {
  return Math.ceil(total / limit);
};

/**
 * Async handler wrapper to catch errors
 */
export const catchAsync = (
  fn: (req: any, res: any, next: any) => Promise<any>
) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};



