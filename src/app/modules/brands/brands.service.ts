import { eq, ne, ilike, and, asc, desc, count, SQL } from "drizzle-orm";
import { db } from "../../../db";
import { brands, products } from "../../../db/schema";
import { NotFoundError, ConflictError, BusinessRuleError } from "../../errors";
import { uploadEntityImage, buildImagePath, deleteImageByUrl } from "../../../lib/image-upload";
import type { CreateBrandInput, UpdateBrandInput, GetBrandsInput } from "./brands.schema";

export async function getBrands(filters: GetBrandsInput) {
  const conditions: SQL[] = [];

  if (filters.isActive !== undefined) {
    conditions.push(eq(brands.isActive, filters.isActive === "true"));
  }
  if (filters.search) {
    conditions.push(ilike(brands.name, `%${filters.search}%`));
  }

  const sortCol = filters.sortBy === "name" ? brands.name : brands.createdAt;
  const sortDir = filters.sortOrder === "asc" ? asc(sortCol) : desc(sortCol);
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(brands)
      .where(where)
      .orderBy(sortDir)
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit),
    db.select({ total: count() }).from(brands).where(where),
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

export async function getBrandById(id: string) {
  const [brand] = await db.select().from(brands).where(eq(brands.id, id));
  if (!brand) throw new NotFoundError("Brand");
  return brand;
}

export async function createBrand(input: CreateBrandInput, file?: Express.Multer.File) {
  const [existing] = await db.select({ id: brands.id })
    .from(brands)
    .where(eq(brands.slug, input.slug));
  if (existing) throw new ConflictError(`Slug "${input.slug}" is already taken`);

  const [created] = await db.insert(brands).values({
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    logoUrl: input.logoUrl ?? null,
    websiteUrl: input.websiteUrl ?? null,
    isActive: input.isActive,
  }).returning();

  if (file && created) {
    const storagePath = buildImagePath("brands", created.id, "logo", file);
    const logoUrl = await uploadEntityImage(storagePath, file);
    const [withLogo] = await db.update(brands)
      .set({ logoUrl, updatedAt: new Date().toISOString() })
      .where(eq(brands.id, created.id))
      .returning();
    return withLogo!;
  }

  return created!;
}

export async function updateBrand(id: string, input: UpdateBrandInput, file?: Express.Multer.File) {
  const existing = await getBrandById(id);

  if (input.slug) {
    const [conflict] = await db.select({ id: brands.id })
      .from(brands)
      .where(and(eq(brands.slug, input.slug), ne(brands.id, id)));
    if (conflict) throw new ConflictError(`Slug "${input.slug}" is already taken`);
  }

  let logoUrl = input.logoUrl;

  if (file) {
    if (existing.logoUrl) await deleteImageByUrl(existing.logoUrl);
    const storagePath = buildImagePath("brands", id, "logo", file);
    logoUrl = await uploadEntityImage(storagePath, file);
  }

  const [updated] = await db.update(brands)
    .set({ ...input, ...(logoUrl !== undefined && { logoUrl }), updatedAt: new Date().toISOString() })
    .where(eq(brands.id, id))
    .returning();

  return updated!;
}

export async function deleteBrand(id: string) {
  const brand = await getBrandById(id);

  const [{ productCount }] = await db
    .select({ productCount: count() })
    .from(products)
    .where(eq(products.brandId, id));

  if (Number(productCount) > 0) {
    throw new BusinessRuleError(
      `Cannot delete brand "${brand.name}" — it has ${productCount} product(s). Reassign or delete them first.`
    );
  }

  await db.delete(brands).where(eq(brands.id, id));
}
