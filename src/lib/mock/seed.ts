import type { BomRow } from "@/types/bom";

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
