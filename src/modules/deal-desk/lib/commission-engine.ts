import type { CommissionBand, TeamMember, ProjectType } from "@/types/deal-desk";

// Enterprise commission matrix — band lookup key: gross margin %
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

// Pod/SE commission matrix — band lookup key: net profit margin % (gross profit − 12% overhead) / revenue
// No Director role; BD and DE split only. Commission applied to gross revenue.
export const POD_COMMISSION_MATRIX: CommissionBand[] = [
  { label: "35% or higher",  minPct: 35,   maxPct: 100,  totalBps: 500, directorBps: 0, bdBps: 429, deBps: 71 },
  { label: "25%–34.99%",     minPct: 25,   maxPct: 34.99,totalBps: 450, directorBps: 0, bdBps: 386, deBps: 64 },
  { label: "20%–24.99%",     minPct: 20,   maxPct: 24.99,totalBps: 400, directorBps: 0, bdBps: 350, deBps: 50 },
  { label: "19%–19.99%",     minPct: 19,   maxPct: 19.99,totalBps: 333, directorBps: 0, bdBps: 285, deBps: 48 },
  { label: "18%–18.99%",     minPct: 18,   maxPct: 18.99,totalBps: 315, directorBps: 0, bdBps: 270, deBps: 45 },
  { label: "17%–17.99%",     minPct: 17,   maxPct: 17.99,totalBps: 298, directorBps: 0, bdBps: 255, deBps: 43 },
  { label: "16%–16.99%",     minPct: 16,   maxPct: 16.99,totalBps: 280, directorBps: 0, bdBps: 240, deBps: 40 },
  { label: "15%–15.99%",     minPct: 15,   maxPct: 15.99,totalBps: 263, directorBps: 0, bdBps: 225, deBps: 38 },
  { label: "14%–14.99%",     minPct: 14,   maxPct: 14.99,totalBps: 245, directorBps: 0, bdBps: 210, deBps: 35 },
  { label: "13%–13.99%",     minPct: 13,   maxPct: 13.99,totalBps: 228, directorBps: 0, bdBps: 195, deBps: 33 },
  { label: "12%–12.99%",     minPct: 12,   maxPct: 12.99,totalBps: 210, directorBps: 0, bdBps: 180, deBps: 30 },
  { label: "11%–11.99%",     minPct: 11,   maxPct: 11.99,totalBps: 193, directorBps: 0, bdBps: 165, deBps: 28 },
  { label: "10%–10.99%",     minPct: 10,   maxPct: 10.99,totalBps: 175, directorBps: 0, bdBps: 150, deBps: 25 },
  { label: "9%–9.99%",       minPct: 9,    maxPct: 9.99, totalBps: 125, directorBps: 0, bdBps: 107, deBps: 18 },
  { label: "7%–8.99%",       minPct: 7,    maxPct: 8.99, totalBps: 75,  directorBps: 0, bdBps: 64,  deBps: 11 },
  { label: "6.99% or lower", minPct: 0,    maxPct: 6.99, totalBps: 50,  directorBps: 0, bdBps: 43,  deBps: 7  },
];

// Company-level overhead rates (basis points). Configurable in future.
export const SALARIES_OVERHEAD_BPS = 1200; // 12% of revenue
export const LEADERSHIP_BONUS_RATE = 0.10;  // 10% of mason profit

export function getCommissionMatrix(projectType?: ProjectType): CommissionBand[] {
  return projectType === "Pod" ? POD_COMMISSION_MATRIX : DEFAULT_COMMISSION_MATRIX;
}

export function findBand(marginPct: number, matrix: CommissionBand[] = DEFAULT_COMMISSION_MATRIX): CommissionBand {
  return (
    matrix.find((b) => marginPct >= b.minPct && marginPct <= b.maxPct) ??
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
