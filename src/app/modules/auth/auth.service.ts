import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import { profiles, userAddresses } from "../../../db/schema";
import { NotFoundError, ForbiddenError } from "../../errors/AppError";
import type { UpdateProfileInput, CreateAddressInput, UpdateAddressInput } from "./auth.schema";

export async function getMe(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  // Return profile if exists, or minimal stub
  return profile ?? { id: userId };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  // Upsert: create profile if first time
  const [existing] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, userId));

  if (!existing) {
    const [created] = await db.insert(profiles).values({ id: userId, ...input }).returning();
    return created!;
  }

  const [updated] = await db
    .update(profiles)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(profiles.id, userId))
    .returning();
  return updated!;
}

export async function getAddresses(userId: string) {
  return db.select().from(userAddresses).where(eq(userAddresses.userId, userId));
}

export async function createAddress(userId: string, input: CreateAddressInput) {
  // If isDefault, clear other defaults of same type
  if (input.isDefault) {
    await db.update(userAddresses).set({ isDefault: false })
      .where(and(eq(userAddresses.userId, userId), eq(userAddresses.type, input.type)));
  }

  const [address] = await db.insert(userAddresses).values({ userId, ...input }).returning();
  return address!;
}

export async function updateAddress(userId: string, id: string, input: UpdateAddressInput) {
  const [address] = await db.select().from(userAddresses).where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)));
  if (!address) throw new NotFoundError("Address");

  if (input.isDefault) {
    const type = input.type ?? address.type ?? "shipping";
    await db.update(userAddresses).set({ isDefault: false }).where(and(eq(userAddresses.userId, userId), eq(userAddresses.type, type)));
  }

  const [updated] = await db.update(userAddresses)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)))
    .returning();
  return updated!;
}

export async function deleteAddress(userId: string, id: string) {
  const [address] = await db.select({ id: userAddresses.id }).from(userAddresses).where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)));
  if (!address) throw new NotFoundError("Address");
  await db.delete(userAddresses).where(and(eq(userAddresses.id, id), eq(userAddresses.userId, userId)));
}
