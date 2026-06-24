import type { EquipmentStatus } from "@/types/equipment";

const FALSY_VALUES = new Set(["", "0", "false", "no", "n"]);

// "Populated or true" — Stock Allocation / Special Order / Cancelled are arbitrary CSV
// cells (a date, a warehouse code, "Yes", a quantity), not strict booleans, so any
// non-empty, non-explicitly-falsy value counts as true.
export function isPopulated(raw: string): boolean {
  return !FALSY_VALUES.has(raw.trim().toLowerCase());
}

export interface EquipmentStatusInput {
  qty: number;
  stockAllocation: string;
  specialOrder: string;
  pickedQty: number;
  shippedQty: number;
  cancelled: string;
}

// Priority order: Cancelled > Shipped > Received > Ordered > Allocated > Not Ordered.
// The qty > 0 guards stop a zero-qty row from always reading as Shipped/Received, since
// shippedQty/pickedQty >= 0 would otherwise always be true.
export function computeEquipmentStatus(input: EquipmentStatusInput): EquipmentStatus {
  if (isPopulated(input.cancelled)) return "Cancelled";
  if (input.qty > 0 && input.shippedQty >= input.qty) return "Shipped";
  if (input.qty > 0 && input.pickedQty >= input.qty) return "Received";
  if (isPopulated(input.specialOrder)) return "Ordered";
  if (isPopulated(input.stockAllocation)) return "Allocated";
  return "Not Ordered";
}
