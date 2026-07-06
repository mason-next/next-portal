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
  poInfo: string;
  notNeeded: boolean;
}

// The distributor stamps this exact phrase into the free-text PO Info column once the item
// has actually arrived at its destination — a stronger, more final signal than shippedQty
// (which only means it left the warehouse), so it outranks Shipped.
export function indicatesDelivered(poInfo: string): boolean {
  return poInfo.toLowerCase().includes("product status: received");
}

// Priority order: Not Needed > Cancelled > Delivered > Shipped > Received > Ordered > Allocated > Not Ordered.
// The qty > 0 guards stop a zero-qty row from always reading as Shipped/Received, since
// shippedQty/pickedQty >= 0 would otherwise always be true.
export function computeEquipmentStatus(input: EquipmentStatusInput): EquipmentStatus {
  if (input.notNeeded) return "Not Needed";
  if (isPopulated(input.cancelled)) return "Cancelled";
  if (indicatesDelivered(input.poInfo)) return "Delivered";
  if (input.qty > 0 && input.shippedQty >= input.qty) return "Shipped";
  if (input.qty > 0 && input.pickedQty >= input.qty) return "Received";
  if (isPopulated(input.specialOrder)) return "Ordered";
  if (isPopulated(input.stockAllocation)) return "Allocated";
  return "Not Ordered";
}
