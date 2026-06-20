import { eq, ne, ilike, and, asc, desc, count, SQL } from "drizzle-orm";
import { db } from "../../../db";
import { brands, products } from "../../../db/schema";
import { NotFoundError, ConflictError, BusinessRuleError } from "../../errors";
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

export async function createBrand(input: CreateBrandInput) {
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

  return created!;
}

export async function updateBrand(id: string, input: UpdateBrandInput) {
  await getBrandById(id);

  if (input.slug) {
    const [conflict] = await db.select({ id: brands.id })
      .from(brands)
      .where(and(eq(brands.slug, input.slug), ne(brands.id, id)));
    if (conflict) throw new ConflictError(`Slug "${input.slug}" is already taken`);
  }

  const [updated] = await db.update(brands)
    .set({ ...input, updatedAt: new Date().toISOString() })
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
