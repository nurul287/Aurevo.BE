import { eq, ne, ilike, and, asc, desc, count, SQL } from "drizzle-orm";
import { db } from "../../../db";
import { categories } from "../../../db/schema";
import { NotFoundError, ConflictError, BusinessRuleError } from "../../errors";
import { uploadFile, deleteFile } from "../../../lib/storage";
import type { CreateCategoryInput, UpdateCategoryInput, GetCategoriesInput } from "./categories.schema";

const BUCKET = "product-images";
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

async function uploadCategoryImage(categoryId: string, file: Express.Multer.File): Promise<string> {
  if (!ALLOWED_MIME.has(file.mimetype)) throw new Error("Use JPG, PNG, WebP, GIF, or AVIF");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller");
  const ext = file.originalname.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `categories/${categoryId}/cover.${ext}`;
  return uploadFile(BUCKET, path, file.buffer, file.mimetype);
}

function extractStoragePath(url: string): string | null {
  // Supabase URL: .../storage/v1/object/public/{bucket}/{path}
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
  return match?.[1] ?? null;
}

export async function getCategories(filters: GetCategoriesInput) {
  const conditions: SQL[] = [];

  if (filters.isActive !== undefined) {
    conditions.push(eq(categories.isActive, filters.isActive === "true"));
  }
  if (filters.parentId !== undefined) {
    conditions.push(eq(categories.parentId, filters.parentId));
  } else if (filters.parentId === undefined && !filters.search) {
    // No parent filter — return all levels
  }
  if (filters.search) {
    conditions.push(ilike(categories.name, `%${filters.search}%`));
  }

  const sortColMap = {
    name: categories.name,
    sortOrder: categories.sortOrder,
    createdAt: categories.createdAt,
  };
  const sortCol = sortColMap[filters.sortBy];
  const sortDir = filters.sortOrder === "asc" ? asc(sortCol) : desc(sortCol);

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(categories)
      .where(where)
      .orderBy(sortDir)
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit),
    db.select({ total: count() }).from(categories).where(where),
  ]);

  const totalCount = Number(total);
  return {
    data: rows,
    meta: {
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / filters.limit),
        hasNext: filters.page * filters.limit < totalCount,
        hasPrev: filters.page > 1,
      },
    },
  };
}

export async function getCategoryById(id: string) {
  const [category] = await db.select().from(categories).where(eq(categories.id, id));
  if (!category) throw new NotFoundError("Category");
  return category;
}

export async function createCategory(
  input: CreateCategoryInput,
  file?: Express.Multer.File,
) {
  const [existing] = await db.select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, input.slug));
  if (existing) throw new ConflictError(`Slug "${input.slug}" is already taken`);

  const [created] = await db.insert(categories).values({
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    parentId: input.parentId ?? null,
    imageUrl: input.imageUrl ?? null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  }).returning();

  if (file && created) {
    const imageUrl = await uploadCategoryImage(created.id, file);
    const [withImage] = await db.update(categories)
      .set({ imageUrl, updatedAt: new Date().toISOString() })
      .where(eq(categories.id, created.id))
      .returning();
    return withImage!;
  }

  return created!;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
  file?: Express.Multer.File,
) {
  const existing = await getCategoryById(id);

  if (input.slug) {
    const [conflict] = await db.select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.slug, input.slug), ne(categories.id, id)));
    if (conflict) throw new ConflictError(`Slug "${input.slug}" is already taken`);
  }

  let imageUrl = input.imageUrl;
  if (file) {
    // Delete old image from storage if present
    if (existing.imageUrl) {
      const oldPath = extractStoragePath(existing.imageUrl);
      if (oldPath) await deleteFile(BUCKET, oldPath).catch(() => {});
    }
    imageUrl = await uploadCategoryImage(id, file);
  }

  const [updated] = await db.update(categories)
    .set({ ...input, imageUrl: imageUrl ?? existing.imageUrl, updatedAt: new Date().toISOString() })
    .where(eq(categories.id, id))
    .returning();

  return updated!;
}

export async function deleteCategory(id: string) {
  const category = await getCategoryById(id); // throws 404 if not found

  // Cannot delete if products exist under this category
  const { products } = await import("../../../db/schema");
  const [{ productCount }] = await db
    .select({ productCount: count() })
    .from(products)
    .where(eq(products.categoryId, id));

  if (Number(productCount) > 0) {
    throw new BusinessRuleError(
      `Cannot delete category "${category.name}" — it has ${productCount} product(s). Reassign or delete them first.`
    );
  }

  await db.delete(categories).where(eq(categories.id, id));
}
