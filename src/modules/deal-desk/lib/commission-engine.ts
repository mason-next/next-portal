import type { CommissionBand, TeamMember } from "@/types/deal-desk";

export const DEFAULT_COMMISSION_MATRIX: CommissionBand[] = [
  { label: "65% or higher",    minPct: 65,   maxPct: 100,   totalBps: 800, directorBps: 200, bdBps: 500, deBps: 100 },
  { label: "60%–64.99%",       minPct: 60,   maxPct: 64.99, totalBps: 775, directorBps: 200, bdBps: 475, deBps: 100 },
  { label: "55%–59.99%",       minPct: 55,   maxPct: 59.99, totalBps: 725, directorBps: 175, bdBps: 450, deBps: 100 },
  { label: "50%–54.99%",       minPct: 50,   maxPct: 54.99, totalBps: 700, directorBps: 175, bdBps: 425, deBps: 100 },
  { label: "45%–49.99%",       minPct: 45,   maxPct: 49.99, totalBps: 625, directorBps: 150, bdBps: 400, deBps: 75  },
  { label: "40%–44.99%",       minPct: 40,   maxPct: 44.99, totalBps: 600, directorBps: 150, bdBps: 375, deBps: 75  },
  { label: "35%–39.99%",       minPct: 35,   maxPct: 39.99, totalBps: 550, directorBps: 125, bdBps: 350, deBps: 75  },
  { label: "30%–34.99%",       minPct: 30,   maxPct: 34.99, totalBps: 500, directorBps: 125, bdBps: 325, deBps: 50  },
  { label: "25%–29.99%",       minPct: 25,   maxPct: 29.99, totalBps: 450, directorBps: 100, bdBps: 300, deBps: 50  },
  { label: "20%–24.99%",       minPct: 20,   maxPct: 24.99, totalBps: 400, directorBps: 100, bdBps: 260, deBps: 40  },
  { label: "19%–19.99%",       minPct: 19,   maxPct: 19.99, totalBps: 350, directorBps: 88,  bdBps: 228, deBps: 35  },
  { label: "18%–18.99%",       minPct: 18,   maxPct: 18.99, totalBps: 250, directorBps: 63,  bdBps: 163, deBps: 25  },
  { label: "17%–17.99%",       minPct: 17,   maxPct: 17.99, totalBps: 200, directorBps: 50,  bdBps: 130, deBps: 20  },
  { label: "16%–16.99%",       minPct: 16,   maxPct: 16.99, totalBps: 151, directorBps: 38,  bdBps: 98,  deBps: 15  },
  { label: "15%–15.99%",       minPct: 15,   maxPct: 15.99, totalBps: 100, directorBps: 25,  bdBps: 65,  deBps: 10  },
  { label: "14.99% and lower", minPct: 0,    maxPct: 14.99, totalBps: 0,   directorBps: 0,   bdBps: 0,   deBps: 0   },
];

// Company-level overhead rates (basis points). Configurable in future.
export const SALARIES_OVERHEAD_BPS = 1200; // 12% of revenue
export const LEADERSHIP_BONUS_RATE = 0.10;  // 10% of mason profit

export function findBand(grossMarginPct: number, matrix: CommissionBand[] = DEFAULT_COMMISSION_MATRIX): CommissionBand {
  return (
    matrix.find((b) => grossMarginPct >= b.minPct && grossMarginPct <= b.maxPct) ??
    matrix[matrix.length - 1]
  );
}

export function memberRateBps(member: TeamMember, band: CommissionBand): number {
  if (member.matrixKey === "custom") return member.customRateBps ?? 0;
  if (member.matrixKey === "director") return band.directorBps;
  if (member.matrixKey === "bd") return band.bdBps;
  if (member.matrixKey === "de") return band.deBps;
  return 0;
}

export function memberPayoutCents(revenueCents: number, member: TeamMember, band: CommissionBand): number {
  return Math.round((revenueCents * memberRateBps(member, band)) / 10000);
}
