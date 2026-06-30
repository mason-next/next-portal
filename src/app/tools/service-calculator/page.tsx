"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { cn } from "@/lib/utils";

// ─── Tier data ────────────────────────────────────────────────────────────────

interface TierRow {
  systemCost: number;
  tickets: number;
  totalServiceCost: number;
  systemPrice: number;
  totalServicePrice: number;
  gp: number;
  gm: number;
}

const ROWS_SILVER: TierRow[] = [
  { systemCost: 4000,   tickets: 1,  totalServiceCost: 526.06,   systemPrice: 5000,    totalServicePrice: 600,     gp: 73.94,    gm: 0.123 },
  { systemCost: 5000,   tickets: 1,  totalServiceCost: 526.06,   systemPrice: 6250,    totalServicePrice: 625,     gp: 98.94,    gm: 0.158 },
  { systemCost: 7500,   tickets: 1,  totalServiceCost: 526.06,   systemPrice: 9375,    totalServicePrice: 750,     gp: 223.94,   gm: 0.299 },
  { systemCost: 10000,  tickets: 2,  totalServiceCost: 689.98,   systemPrice: 12500,   totalServicePrice: 1000,    gp: 310.02,   gm: 0.31  },
  { systemCost: 12500,  tickets: 2,  totalServiceCost: 689.98,   systemPrice: 15625,   totalServicePrice: 1093.75, gp: 403.77,   gm: 0.369 },
  { systemCost: 15000,  tickets: 2,  totalServiceCost: 689.98,   systemPrice: 18750,   totalServicePrice: 1125,    gp: 435.02,   gm: 0.387 },
  { systemCost: 17500,  tickets: 2,  totalServiceCost: 689.98,   systemPrice: 21875,   totalServicePrice: 1312.5,  gp: 622.52,   gm: 0.474 },
  { systemCost: 20000,  tickets: 3,  totalServiceCost: 853.91,   systemPrice: 25000,   totalServicePrice: 1500,    gp: 646.09,   gm: 0.431 },
  { systemCost: 25000,  tickets: 3,  totalServiceCost: 853.91,   systemPrice: 31250,   totalServicePrice: 1562.5,  gp: 708.59,   gm: 0.453 },
  { systemCost: 30000,  tickets: 3,  totalServiceCost: 853.91,   systemPrice: 37500,   totalServicePrice: 1875,    gp: 1021.09,  gm: 0.545 },
  { systemCost: 40000,  tickets: 4,  totalServiceCost: 1017.84,  systemPrice: 50000,   totalServicePrice: 2500,    gp: 1482.16,  gm: 0.593 },
  { systemCost: 50000,  tickets: 4,  totalServiceCost: 1017.84,  systemPrice: 62500,   totalServicePrice: 3125,    gp: 2107.16,  gm: 0.674 },
  { systemCost: 60000,  tickets: 5,  totalServiceCost: 1181.76,  systemPrice: 75000,   totalServicePrice: 3750,    gp: 2568.24,  gm: 0.685 },
  { systemCost: 75000,  tickets: 5,  totalServiceCost: 1181.76,  systemPrice: 93750,   totalServicePrice: 4687.5,  gp: 3505.74,  gm: 0.748 },
  { systemCost: 90000,  tickets: 6,  totalServiceCost: 1345.69,  systemPrice: 112500,  totalServicePrice: 5625,    gp: 4279.31,  gm: 0.761 },
  { systemCost: 100000, tickets: 6,  totalServiceCost: 1345.69,  systemPrice: 125000,  totalServicePrice: 6250,    gp: 4904.31,  gm: 0.785 },
  { systemCost: 125000, tickets: 7,  totalServiceCost: 1509.61,  systemPrice: 156250,  totalServicePrice: 7812.5,  gp: 6302.89,  gm: 0.807 },
  { systemCost: 150000, tickets: 7,  totalServiceCost: 1509.61,  systemPrice: 187500,  totalServicePrice: 9375,    gp: 7865.39,  gm: 0.839 },
  { systemCost: 175000, tickets: 8,  totalServiceCost: 1673.54,  systemPrice: 218750,  totalServicePrice: 10937.5, gp: 9263.96,  gm: 0.847 },
  { systemCost: 200000, tickets: 9,  totalServiceCost: 1837.46,  systemPrice: 250000,  totalServicePrice: 12500,   gp: 10662.54, gm: 0.853 },
  { systemCost: 225000, tickets: 9,  totalServiceCost: 1837.46,  systemPrice: 281250,  totalServicePrice: 14062.5, gp: 12225.04, gm: 0.869 },
  { systemCost: 250000, tickets: 10, totalServiceCost: 2001.39,  systemPrice: 312500,  totalServicePrice: 15625,   gp: 13623.61, gm: 0.872 },
  { systemCost: 275000, tickets: 10, totalServiceCost: 2001.39,  systemPrice: 343750,  totalServicePrice: 17187.5, gp: 15186.11, gm: 0.884 },
  { systemCost: 300000, tickets: 11, totalServiceCost: 2165.31,  systemPrice: 375000,  totalServicePrice: 18750,   gp: 16584.69, gm: 0.885 },
  { systemCost: 325000, tickets: 12, totalServiceCost: 2329.24,  systemPrice: 406250,  totalServicePrice: 20312.5, gp: 17983.26, gm: 0.885 },
  { systemCost: 350000, tickets: 12, totalServiceCost: 2329.24,  systemPrice: 437500,  totalServicePrice: 21875,   gp: 19545.76, gm: 0.894 },
  { systemCost: 375000, tickets: 13, totalServiceCost: 2493.16,  systemPrice: 468750,  totalServicePrice: 23437.5, gp: 20944.34, gm: 0.894 },
  { systemCost: 400000, tickets: 14, totalServiceCost: 2657.09,  systemPrice: 500000,  totalServicePrice: 25000,   gp: 22342.91, gm: 0.894 },
  { systemCost: 500000, tickets: 15, totalServiceCost: 2821.02,  systemPrice: 625000,  totalServicePrice: 28125,   gp: 25303.98, gm: 0.90  },
  { systemCost: 600000, tickets: 16, totalServiceCost: 2984.94,  systemPrice: 750000,  totalServicePrice: 30000,   gp: 27015.06, gm: 0.901 },
  { systemCost: 700000, tickets: 17, totalServiceCost: 3148.87,  systemPrice: 875000,  totalServicePrice: 35000,   gp: 31851.13, gm: 0.91  },
  { systemCost: 800000, tickets: 18, totalServiceCost: 3312.79,  systemPrice: 1000000, totalServicePrice: 40000,   gp: 36687.21, gm: 0.917 },
];

const ROWS_GOLD: TierRow[] = [
  { systemCost: 4000,   tickets: 2,  totalServiceCost: 779.02,   systemPrice: 5000,    totalServicePrice: 900,     gp: 120.98,   gm: 0.134 },
  { systemCost: 5000,   tickets: 2,  totalServiceCost: 779.02,   systemPrice: 6250,    totalServicePrice: 1000,    gp: 220.98,   gm: 0.221 },
  { systemCost: 7500,   tickets: 2,  totalServiceCost: 779.02,   systemPrice: 9375,    totalServicePrice: 1125,    gp: 345.98,   gm: 0.308 },
  { systemCost: 10000,  tickets: 3,  totalServiceCost: 1031.98,  systemPrice: 12500,   totalServicePrice: 1500,    gp: 468.02,   gm: 0.312 },
  { systemCost: 12500,  tickets: 3,  totalServiceCost: 1031.98,  systemPrice: 15625,   totalServicePrice: 1562.5,  gp: 530.52,   gm: 0.34  },
  { systemCost: 15000,  tickets: 3,  totalServiceCost: 1031.98,  systemPrice: 18750,   totalServicePrice: 1687.5,  gp: 655.52,   gm: 0.388 },
  { systemCost: 17500,  tickets: 3,  totalServiceCost: 1031.98,  systemPrice: 21875,   totalServicePrice: 1968.75, gp: 936.77,   gm: 0.476 },
  { systemCost: 20000,  tickets: 5,  totalServiceCost: 1448.87,  systemPrice: 25000,   totalServicePrice: 2250,    gp: 801.13,   gm: 0.356 },
  { systemCost: 25000,  tickets: 5,  totalServiceCost: 1448.87,  systemPrice: 31250,   totalServicePrice: 2500,    gp: 1051.13,  gm: 0.42  },
  { systemCost: 30000,  tickets: 5,  totalServiceCost: 1448.87,  systemPrice: 37500,   totalServicePrice: 2625,    gp: 1176.13,  gm: 0.448 },
  { systemCost: 40000,  tickets: 6,  totalServiceCost: 1612.8,   systemPrice: 50000,   totalServicePrice: 3500,    gp: 1887.2,   gm: 0.539 },
  { systemCost: 50000,  tickets: 6,  totalServiceCost: 1612.8,   systemPrice: 62500,   totalServicePrice: 4375,    gp: 2762.2,   gm: 0.631 },
  { systemCost: 60000,  tickets: 8,  totalServiceCost: 2029.69,  systemPrice: 75000,   totalServicePrice: 5250,    gp: 3220.31,  gm: 0.613 },
  { systemCost: 75000,  tickets: 8,  totalServiceCost: 2029.69,  systemPrice: 93750,   totalServicePrice: 6562.5,  gp: 4532.81,  gm: 0.691 },
  { systemCost: 90000,  tickets: 9,  totalServiceCost: 2282.65,  systemPrice: 112500,  totalServicePrice: 7875,    gp: 5592.35,  gm: 0.71  },
  { systemCost: 100000, tickets: 9,  totalServiceCost: 2282.65,  systemPrice: 125000,  totalServicePrice: 8750,    gp: 6467.35,  gm: 0.739 },
  { systemCost: 125000, tickets: 11, totalServiceCost: 2699.54,  systemPrice: 156250,  totalServicePrice: 10937.5, gp: 8237.96,  gm: 0.753 },
  { systemCost: 150000, tickets: 11, totalServiceCost: 2699.54,  systemPrice: 187500,  totalServicePrice: 13125,   gp: 10425.46, gm: 0.794 },
  { systemCost: 175000, tickets: 12, totalServiceCost: 2863.46,  systemPrice: 218750,  totalServicePrice: 15312.5, gp: 12449.04, gm: 0.813 },
  { systemCost: 200000, tickets: 14, totalServiceCost: 3280.35,  systemPrice: 250000,  totalServicePrice: 17500,   gp: 14219.65, gm: 0.813 },
  { systemCost: 225000, tickets: 14, totalServiceCost: 3280.35,  systemPrice: 281250,  totalServicePrice: 19687.5, gp: 16407.15, gm: 0.833 },
  { systemCost: 250000, tickets: 15, totalServiceCost: 3533.31,  systemPrice: 312500,  totalServicePrice: 21875,   gp: 18341.69, gm: 0.838 },
  { systemCost: 275000, tickets: 15, totalServiceCost: 3533.31,  systemPrice: 343750,  totalServicePrice: 24062.5, gp: 20529.19, gm: 0.853 },
  { systemCost: 300000, tickets: 17, totalServiceCost: 3950.2,   systemPrice: 375000,  totalServicePrice: 26250,   gp: 22299.8,  gm: 0.85  },
  { systemCost: 325000, tickets: 18, totalServiceCost: 4114.13,  systemPrice: 406250,  totalServicePrice: 28437.5, gp: 24323.37, gm: 0.855 },
  { systemCost: 350000, tickets: 18, totalServiceCost: 4114.13,  systemPrice: 437500,  totalServicePrice: 30625,   gp: 26510.87, gm: 0.866 },
  { systemCost: 375000, tickets: 20, totalServiceCost: 4531.02,  systemPrice: 468750,  totalServicePrice: 32812.5, gp: 28281.48, gm: 0.862 },
  { systemCost: 400000, tickets: 21, totalServiceCost: 4783.98,  systemPrice: 500000,  totalServicePrice: 35000,   gp: 30216.02, gm: 0.863 },
  { systemCost: 500000, tickets: 23, totalServiceCost: 5200.87,  systemPrice: 625000,  totalServicePrice: 40625,   gp: 35424.13, gm: 0.872 },
  { systemCost: 600000, tickets: 24, totalServiceCost: 5364.79,  systemPrice: 750000,  totalServicePrice: 45000,   gp: 39635.21, gm: 0.881 },
  { systemCost: 700000, tickets: 26, totalServiceCost: 5781.68,  systemPrice: 875000,  totalServicePrice: 52500,   gp: 46718.32, gm: 0.89  },
  { systemCost: 800000, tickets: 27, totalServiceCost: 6034.64,  systemPrice: 1000000, totalServicePrice: 60000,   gp: 53965.36, gm: 0.899 },
];

const ROWS_PLATINUM: TierRow[] = [
  { systemCost: 10000,  tickets: 4,  totalServiceCost: 4253.98,  systemPrice: 12500,   totalServicePrice: 7125,    gp: 2871.02,  gm: 0.403 },
  { systemCost: 12500,  tickets: 4,  totalServiceCost: 4253.98,  systemPrice: 15625,   totalServicePrice: 7343.75, gp: 3089.77,  gm: 0.421 },
  { systemCost: 15000,  tickets: 4,  totalServiceCost: 4253.98,  systemPrice: 18750,   totalServicePrice: 7500,    gp: 3246.02,  gm: 0.433 },
  { systemCost: 17500,  tickets: 4,  totalServiceCost: 4253.98,  systemPrice: 21875,   totalServicePrice: 7875,    gp: 3621.02,  gm: 0.46  },
  { systemCost: 20000,  tickets: 6,  totalServiceCost: 4759.91,  systemPrice: 25000,   totalServicePrice: 8000,    gp: 3240.09,  gm: 0.405 },
  { systemCost: 25000,  tickets: 6,  totalServiceCost: 4759.91,  systemPrice: 31250,   totalServicePrice: 8125,    gp: 3365.09,  gm: 0.414 },
  { systemCost: 30000,  tickets: 6,  totalServiceCost: 4759.91,  systemPrice: 37500,   totalServicePrice: 8250,    gp: 3490.09,  gm: 0.423 },
  { systemCost: 40000,  tickets: 8,  totalServiceCost: 5265.84,  systemPrice: 50000,   totalServicePrice: 8500,    gp: 3234.16,  gm: 0.38  },
  { systemCost: 50000,  tickets: 8,  totalServiceCost: 5265.84,  systemPrice: 62500,   totalServicePrice: 8750,    gp: 3484.16,  gm: 0.398 },
  { systemCost: 60000,  tickets: 10, totalServiceCost: 5771.76,  systemPrice: 75000,   totalServicePrice: 9000,    gp: 3228.24,  gm: 0.359 },
  { systemCost: 75000,  tickets: 10, totalServiceCost: 5771.76,  systemPrice: 93750,   totalServicePrice: 9375,    gp: 3603.24,  gm: 0.384 },
  { systemCost: 90000,  tickets: 12, totalServiceCost: 6277.69,  systemPrice: 112500,  totalServicePrice: 10125,   gp: 3847.31,  gm: 0.38  },
  { systemCost: 100000, tickets: 12, totalServiceCost: 6277.69,  systemPrice: 125000,  totalServicePrice: 11250,   gp: 4972.31,  gm: 0.442 },
  { systemCost: 125000, tickets: 14, totalServiceCost: 6783.61,  systemPrice: 156250,  totalServicePrice: 14062.5, gp: 7278.89,  gm: 0.518 },
  { systemCost: 150000, tickets: 14, totalServiceCost: 6783.61,  systemPrice: 187500,  totalServicePrice: 16875,   gp: 10091.39, gm: 0.598 },
  { systemCost: 175000, tickets: 16, totalServiceCost: 7289.54,  systemPrice: 218750,  totalServicePrice: 19687.5, gp: 12397.96, gm: 0.63  },
  { systemCost: 200000, tickets: 18, totalServiceCost: 7795.46,  systemPrice: 250000,  totalServicePrice: 22500,   gp: 14704.54, gm: 0.654 },
  { systemCost: 225000, tickets: 18, totalServiceCost: 7795.46,  systemPrice: 281250,  totalServicePrice: 25312.5, gp: 17517.04, gm: 0.692 },
  { systemCost: 250000, tickets: 20, totalServiceCost: 8301.39,  systemPrice: 312500,  totalServicePrice: 28125,   gp: 19823.61, gm: 0.705 },
  { systemCost: 275000, tickets: 20, totalServiceCost: 8301.39,  systemPrice: 343750,  totalServicePrice: 30937.5, gp: 22636.11, gm: 0.732 },
  { systemCost: 300000, tickets: 22, totalServiceCost: 8807.31,  systemPrice: 375000,  totalServicePrice: 33750,   gp: 24942.69, gm: 0.739 },
  { systemCost: 325000, tickets: 24, totalServiceCost: 9313.24,  systemPrice: 406250,  totalServicePrice: 36562.5, gp: 27249.26, gm: 0.745 },
  { systemCost: 350000, tickets: 24, totalServiceCost: 9313.24,  systemPrice: 437500,  totalServicePrice: 39375,   gp: 30061.76, gm: 0.763 },
  { systemCost: 375000, tickets: 26, totalServiceCost: 9819.16,  systemPrice: 468750,  totalServicePrice: 42187.5, gp: 32368.34, gm: 0.767 },
  { systemCost: 400000, tickets: 28, totalServiceCost: 10325.09, systemPrice: 500000,  totalServicePrice: 45000,   gp: 34674.91, gm: 0.771 },
  { systemCost: 500000, tickets: 30, totalServiceCost: 10831.02, systemPrice: 625000,  totalServicePrice: 56250,   gp: 45418.98, gm: 0.807 },
  { systemCost: 600000, tickets: 32, totalServiceCost: 11336.94, systemPrice: 750000,  totalServicePrice: 67500,   gp: 56163.06, gm: 0.832 },
  { systemCost: 700000, tickets: 34, totalServiceCost: 11842.87, systemPrice: 875000,  totalServicePrice: 78750,   gp: 66907.13, gm: 0.85  },
  { systemCost: 800000, tickets: 36, totalServiceCost: 12348.79, systemPrice: 1000000, totalServicePrice: 90000,   gp: 77651.21, gm: 0.863 },
];

type TierKey = "silver" | "gold" | "platinum";

const TIER_DATA: Record<TierKey, TierRow[]> = {
  silver:   ROWS_SILVER,
  gold:     ROWS_GOLD,
  platinum: ROWS_PLATINUM,
};

const ADDL_SYSTEM_COST = 362.13;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findBandRow(rows: TierRow[], targetSystemPrice: number): TierRow {
  const sorted = [...rows].sort((a, b) => a.systemPrice - b.systemPrice);
  for (const row of sorted) {
    if (row.systemPrice >= targetSystemPrice) return row;
  }
  return sorted[sorted.length - 1]!;
}

function calculate(price: number, rooms: number, nodes: number, tier: TierKey) {
  const rows = TIER_DATA[tier];
  if (price <= 0) return null;

  const extraNodes = Math.max(0, nodes - 1);
  const perRoomPrice = rooms > 0 ? price / rooms : price;
  const bandRow = findBandRow(rows, perRoomPrice);

  const baseCost    = bandRow.totalServiceCost * rooms;
  const basePrice   = bandRow.totalServicePrice * rooms;
  const baseTickets = bandRow.tickets * rooms;

  const addlCost  = ADDL_SYSTEM_COST * extraNodes;
  const addlPrice = bandRow.gm >= 0 && bandRow.gm < 1 ? addlCost / (1 - bandRow.gm) : 0;

  const totalCost  = baseCost + addlCost;
  const totalPrice = basePrice + addlPrice;
  const gp = Math.max(0, totalPrice - totalCost);
  const gm = totalPrice > 0 ? gp / totalPrice : 0;

  return {
    totalServicePrice: totalPrice,
    serviceCost: totalCost,
    grossProfit: gp,
    grossMargin: gm,
    ticketsPerYear: baseTickets,
    bandSystemCost: bandRow.systemCost,
  };
}

function fmt$(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPct(n: number): string {
  if (!isFinite(n) || n <= 0) return "0.0%";
  return (n * 100).toFixed(1) + "%";
}

function rangePct(val: number, min: number, max: number) {
  return ((val - min) / (max - min)) * 100;
}

// ─── Tier details data ────────────────────────────────────────────────────────

const TIER_DETAILS = [
  { feature: "Help-Desk Hours",                  noContract: "9am – 5pm (EST)",    silver: "9am – 5pm (EST)",  gold: "8am – 8pm (EST)",  platinum: "24 / 7" },
  { feature: "Remote Support Response Time",     noContract: "By tier priority",   silver: "4 Biz Hours",      gold: "2 Biz Hours",       platinum: "1 Hour" },
  { feature: "Remote Support Rates (1-hr min)",  noContract: "$200/hr",            silver: "Unlimited",        gold: "Unlimited",         platinum: "Unlimited" },
  { feature: "Onsite Support Response Time",     noContract: "By tier priority",   silver: "3 Biz Days",       gold: "2 Biz Days",        platinum: "Next Biz Day" },
  { feature: "Onsite Support Rates (4-hr min)",  noContract: "$250–$290/hr",       silver: "$200–$240/hr",     gold: "$180–$220/hr",      platinum: "$160–$200/hr" },
  { feature: "Preventative Maintenance",         noContract: "N/A",                silver: "N/A",              gold: "1 Visit",           platinum: "2 Visits" },
  { feature: "Payment Terms",                    noContract: "Prepaid",            silver: "Net 30",           gold: "Net 30",            platinum: "Net 30" },
];

// ─── Component ────────────────────────────────────────────────────────────────

const TIER_STYLES: Record<TierKey, { active: string; label: string }> = {
  silver:   { active: "border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",   label: "Silver" },
  gold:     { active: "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", label: "Gold" },
  platinum: { active: "border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300", label: "Platinum" },
};

export default function ServiceCalculatorPage() {
  const [price, setPrice]               = useState(12500);
  const [priceInput, setPriceInput]     = useState("");
  const [isEditingPrice, setEditing]    = useState(false);
  const [rooms, setRooms]               = useState(1);
  const [nodes, setNodes]               = useState(1);
  const [tier, setTier]                 = useState<TierKey>("silver");
  const [showDetails, setShowDetails]   = useState(false);

  const result = calculate(price, rooms, nodes, tier);

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/tools" className="hover:text-foreground">Tools</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Service Calculator</span>
      </nav>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Service Calculator</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Price managed service contracts by tier, rooms, and nodes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── Inputs ── */}
        <div className="rounded-xl border bg-card p-6 space-y-7">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Inputs</h2>

          {/* Customer price */}
          <div className="space-y-2">
            <label htmlFor="svc-price" className="text-sm font-medium block">
              Customer Price
              <span className="ml-1 font-normal text-muted-foreground">(Hardware &amp; Software Only)</span>
            </label>
            <input
              id="svc-price"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="$12,500.00"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              value={isEditingPrice ? priceInput : (price > 0 ? fmt$(price, 2) : "")}
              onFocus={() => {
                setEditing(true);
                setPriceInput(price > 0 ? String(price) : "");
              }}
              onChange={(e) => {
                setPriceInput(e.target.value);
                const n = Number(e.target.value.replace(/[^\d.]/g, ""));
                if (isFinite(n) && n >= 0) setPrice(n);
              }}
              onBlur={() => {
                setEditing(false);
                const n = Number(priceInput.replace(/[^\d.]/g, "")) || 0;
                setPrice(n);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            />
            {result && (
              <p className="text-xs text-muted-foreground">
                Cost band: {fmt$(result.bandSystemCost)} &middot; {result.ticketsPerYear} ticket{result.ticketsPerYear !== 1 ? "s" : ""}/yr
              </p>
            )}
          </div>

          {/* Rooms slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="svc-rooms" className="text-sm font-medium">Number of Rooms</label>
              <span className="text-sm font-semibold tabular-nums">{rooms} {rooms === 1 ? "Room" : "Rooms"}</span>
            </div>
            <input
              id="svc-rooms"
              type="range"
              min={1}
              max={25}
              step={1}
              value={rooms}
              onChange={(e) => setRooms(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${rangePct(rooms, 1, 25)}%, hsl(var(--muted)) ${rangePct(rooms, 1, 25)}%)`,
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 Room</span>
              <span>25 Rooms</span>
            </div>
          </div>

          {/* Nodes slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="svc-nodes" className="text-sm font-medium">Number of Nodes</label>
              <span className="text-sm font-semibold tabular-nums">{nodes} {nodes === 1 ? "Node" : "Nodes"}</span>
            </div>
            <input
              id="svc-nodes"
              type="range"
              min={1}
              max={50}
              step={1}
              value={nodes}
              onChange={(e) => setNodes(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${rangePct(nodes, 1, 50)}%, hsl(var(--muted)) ${rangePct(nodes, 1, 50)}%)`,
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 Node</span>
              <span>50 Nodes</span>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">

          {/* Tier selector */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Service Tier</h2>
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="text-xs text-primary hover:underline underline-offset-2"
              >
                See Details
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["silver", "gold", "platinum"] as TierKey[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={cn(
                    "h-9 rounded-md border text-sm font-medium transition-colors",
                    tier === t
                      ? TIER_STYLES[t].active
                      : "border-input bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  {TIER_STYLES[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="rounded-xl border bg-card p-6 space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Results</h2>

            {/* Total service price — hero */}
            <div className="text-center py-2">
              <div className="text-xs text-muted-foreground mb-2">Total Service Price</div>
              <div className="text-5xl font-bold tracking-tight tabular-nums">
                {result ? fmt$(result.totalServicePrice) : "—"}
              </div>
              {result && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {result.ticketsPerYear} support ticket{result.ticketsPerYear !== 1 ? "s" : ""} / year
                </div>
              )}
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-4 text-center">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Service Cost</div>
                <div className="text-base font-semibold tabular-nums">
                  {result ? fmt$(result.serviceCost, 2) : "—"}
                </div>
              </div>
              <div className="border-x">
                <div className="text-xs text-muted-foreground mb-1">Gross Margin</div>
                <div className="text-base font-semibold tabular-nums">
                  {result ? fmtPct(result.grossMargin) : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Gross Profit</div>
                <div className="text-base font-semibold tabular-nums">
                  {result ? fmt$(result.grossProfit, 2) : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Assumptions note */}
          <div className="rounded-xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground/70">Assumptions</p>
            <p>Pricing is based on customer-facing hardware &amp; software price, not cost.</p>
            <p>Additional nodes beyond the first are priced at ${ADDL_SYSTEM_COST}/node (cost), marked up at the band&apos;s gross margin.</p>
            <p>Platinum tier minimum starts at $12,500 system price.</p>
          </div>
        </div>
      </div>

      {/* Tier details modal */}
      {showDetails && (
        <Modal open onClose={() => setShowDetails(false)} className="max-w-3xl">
          <h2 className="mb-4 text-base font-semibold">Tier Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 text-left font-semibold text-muted-foreground">Feature</th>
                  <th className="py-2 px-3 text-center font-semibold text-muted-foreground">No Contract</th>
                  <th className="py-2 px-3 text-center font-semibold text-slate-600 dark:text-slate-300">Silver</th>
                  <th className="py-2 px-3 text-center font-semibold text-amber-600 dark:text-amber-400">Gold</th>
                  <th className="py-2 px-3 text-center font-semibold text-violet-600 dark:text-violet-400">Platinum</th>
                </tr>
              </thead>
              <tbody>
                {TIER_DETAILS.map((row) => (
                  <tr key={row.feature} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-foreground/80">{row.feature}</td>
                    <td className="py-2.5 px-3 text-center text-muted-foreground">{row.noContract}</td>
                    <td className="py-2.5 px-3 text-center">{row.silver}</td>
                    <td className="py-2.5 px-3 text-center font-medium text-amber-700 dark:text-amber-400">{row.gold}</td>
                    <td className="py-2.5 px-3 text-center font-medium text-violet-700 dark:text-violet-400">{row.platinum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="outline" onClick={() => setShowDetails(false)}>Close</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
