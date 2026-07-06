import type { BomRow } from "@/types/bom";
import type { EquipmentRow } from "@/types/equipment";
import { computeEquipmentStatus } from "@/modules/equipment-tracking/lib/status";

const MANUFACTURERS = [
  "Cisco", "QSC", "Shure", "LG", "Chief", "Netgear",
  "Crestron", "Biamp", "Samsung", "Extron", "Legrand", "Middle Atlantic",
];
const PARTS = [
  "CS-KITPRO-K9", "CORE-110F-V2", "MXA920W-S", "75UH5N-E", "XTM1U", "M4250-26G4F",
  "HD-TX-4KZ-101", "TESIRAFORTE", "QM65B", "DTP-T-HWP", "C2G-54427", "BGR-4527",
];
const DESCRIPTIONS = [
  "Room codec bundle", "DSP processor", "Ceiling array microphone", "Commercial display",
  "Tilt wall mount", "Managed PoE+ network switch", "4K transmitter", "Audio DSP with Dante",
  "65 inch commercial display", "HDBaseT wallplate transmitter", "USB-C adapter cable",
  "Equipment rack enclosure",
];

export function generateSampleBomRows(count = 50): BomRow[] {
  const now = new Date().toISOString();
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    seq: String(i + 1).padStart(3, "0"),
    mfr: MANUFACTURERS[i % MANUFACTURERS.length],
    part: PARTS[i % PARTS.length],
    desc: DESCRIPTIONS[i % DESCRIPTIONS.length],
    qty: (i % 4) + 1,
    unitCost: ((i % 6) + 1) * 125,
    status: "Pending Review",
    releaseId: null,
    release: null,
    releasedAt: null,
    notes: "",
    audit: [],
    updatedAt: now,
  }));
}

// Cycles through every status (plus partially-received/partially-shipped exception cases)
// across a 10-row pattern so the sample project exercises the full Equipment Tracking UI.
export function generateSampleEquipmentRows(count = 50): EquipmentRow[] {
  const now = new Date().toISOString();
  return Array.from({ length: count }, (_, i) => {
    const qty = (i % 4) + 1;
    const bucket = i % 10;

    let stockAllocation = "";
    let specialOrder = "";
    let pickedQty = 0;
    let shippedQty = 0;
    let cancelled = "";
    let poInfo = "";

    switch (bucket) {
      case 1: // Allocated
        stockAllocation = "NY-WH-A12";
        break;
      case 2: // Ordered
        specialOrder = "2026-01-15";
        break;
      case 3: // Ordered, partially received
        specialOrder = "2026-01-18";
        pickedQty = Math.max(1, qty - 1) < qty ? Math.max(1, qty - 1) : 0;
        break;
      case 4: // Received
        specialOrder = "2026-01-10";
        pickedQty = qty;
        break;
      case 5: // Received, partially shipped
        specialOrder = "2026-01-08";
        pickedQty = qty;
        shippedQty = Math.max(1, qty - 1) < qty ? Math.max(1, qty - 1) : 0;
        break;
      case 6: // Shipped
      case 7:
        specialOrder = "2026-01-05";
        pickedQty = qty;
        shippedQty = qty;
        break;
      case 8: // Cancelled
        specialOrder = "2026-01-12";
        cancelled = "2026-02-01";
        break;
      case 9: // Delivered
        specialOrder = "2026-01-03";
        pickedQty = qty;
        shippedQty = qty;
        poInfo = "Product Status: Received";
        break;
      default: // Not Ordered
        break;
    }

    const status = computeEquipmentStatus({
      qty,
      stockAllocation,
      specialOrder,
      pickedQty,
      shippedQty,
      cancelled,
      poInfo,
      notNeeded: false,
    });

    return {
      id: crypto.randomUUID(),
      seq: String(i + 1).padStart(3, "0"),
      mfr: MANUFACTURERS[i % MANUFACTURERS.length],
      product: PARTS[i % PARTS.length],
      desc: DESCRIPTIONS[i % DESCRIPTIONS.length],
      qty,
      // Every 11th item is OFE (Owner Furnished Equipment) — tracked with no cost, hidden from
      // the table and totals by default via the "Hide zero-cost rows" view filter.
      unitCost: i % 11 === 0 ? 0 : ((i % 6) + 1) * 85,
      stockAllocation,
      specialOrder,
      pickedQty,
      shippedQty,
      cancelled,
      poInfo,
      notNeeded: false,
      status,
      rmaRequestedAt: null,
      source: "csv",
      audit: [],
      updatedAt: now,
    };
  });
}
