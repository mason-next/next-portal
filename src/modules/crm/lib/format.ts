// Display helpers shared by the CRM pages. Money is stored in cents.

export function fmtMoney(cents: number | null | undefined): string {
  if (!cents) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function fmtMoneyShort(cents: number | null | undefined): string {
  const v = (cents ?? 0) / 100;
  if (Math.abs(v) >= 1_000_000) return "$" + (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(v) >= 1_000) return "$" + Math.round(v / 1_000) + "K";
  return "$" + Math.round(v).toLocaleString();
}

export function fmtDate(iso: string | null | undefined, opts: { year?: boolean } = {}): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(opts.year === false ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}

/** yyyy-mm-dd for <input type="date">. */
export function toDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Whole days from today (local) to the given date's calendar day; negative = past. */
export function daysFromToday(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

export function relativeDay(iso: string | null | undefined): string {
  const d = daysFromToday(iso);
  if (d === null) return "—";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d < 0) return `${-d}d overdue`;
  if (d < 7) return `in ${d}d`;
  return fmtDate(iso, { year: false });
}

export function daysSince(iso: string | null | undefined): number | null {
  const d = daysFromToday(iso);
  return d === null ? null : -d;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

export function quarterKey(iso: string): string {
  const y = iso.slice(0, 4);
  const q = Math.floor((+iso.slice(5, 7) - 1) / 3) + 1;
  return `${y}-Q${q}`;
}

/** Where an agenda item lives: its account page, scrolled to and highlighting the task or deal. */
export function agendaItemHref(i: { kind: "task" | "closeDate"; id: string; companyId: string | null; opportunityId: string | null }): string | null {
  if (!i.companyId) return null;
  const q = new URLSearchParams();
  if (i.opportunityId) q.set("opp", i.opportunityId);
  if (i.kind === "task") q.set("task", i.id);
  const qs = q.toString();
  return `/sales/accounts/${i.companyId}${qs ? `?${qs}` : ""}`;
}
