"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/access-control";
import type { Warehouse, WarehouseInput } from "@/types/warehouse";

function toWarehouse(p: {
  id: string; name: string; address: string; city: string; state: string;
  zip: string; country: string; contact: string; phone: string; email: string;
  notes: string; isActive: boolean; createdAt: Date; updatedAt: Date;
}): Warehouse {
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    city: p.city,
    state: p.state,
    zip: p.zip,
    country: p.country,
    contact: p.contact,
    phone: p.phone,
    email: p.email,
    notes: p.notes,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function getWarehouses(): Promise<Warehouse[]> {
  const rows = await db.warehouse.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return rows.map(toWarehouse);
}

export async function getActiveWarehouses(): Promise<Warehouse[]> {
  const rows = await db.warehouse.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return rows.map(toWarehouse);
}

export async function createWarehouse(input: WarehouseInput): Promise<Warehouse> {
  await requireAdmin();
  const row = await db.warehouse.create({ data: { ...input } });
  return toWarehouse(row);
}

export async function updateWarehouse(id: string, input: WarehouseInput): Promise<Warehouse> {
  await requireAdmin();
  const row = await db.warehouse.update({ where: { id }, data: { ...input } });
  return toWarehouse(row);
}

export async function deleteWarehouse(id: string): Promise<"deleted" | "deactivated"> {
  await requireAdmin();
  const warehouse = await db.warehouse.findUnique({ where: { id } });
  if (!warehouse) throw new Error("Warehouse not found");

  // If any release references this warehouse by name, deactivate rather than hard-delete
  const referenced = await db.release.count({ where: { shipTo: warehouse.name } });
  if (referenced > 0) {
    await db.warehouse.update({ where: { id }, data: { isActive: false } });
    return "deactivated";
  }
  await db.warehouse.delete({ where: { id } });
  return "deleted";
}

export async function seedDefaultWarehouses(): Promise<void> {
  await requireAdmin();
  const count = await db.warehouse.count();
  if (count > 0) return;
  await db.warehouse.createMany({
    data: [
      {
        name: "NY Warehouse",
        city: "New York",
        state: "NY",
        country: "US",
        notes: "Primary Northeast distribution warehouse",
      },
      {
        name: "Miami Warehouse",
        city: "Miami",
        state: "FL",
        country: "US",
        notes: "Primary Southeast distribution warehouse",
      },
    ],
  });
}
