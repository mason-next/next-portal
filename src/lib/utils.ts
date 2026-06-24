import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" })
}

export function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}…` : value
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString()
}

// For calendar-only fields (kickoff date, target completion, due date) — these are
// user-picked days with no time component. Parsing the date portion directly and building
// a local Date from y/m/d (rather than letting `new Date(isoString)` parse it as UTC
// midnight and then formatting in local time) avoids the day shifting backwards in any
// timezone behind UTC. Accepts both a plain "YYYY-MM-DD" and a full ISO string.
export function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return "—"
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return "—"
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}
