"use client";

// Small presentational building blocks shared across the CRM pages.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import type { OppStage, TaskPriority, AccountStatus, LeadStatus } from "@/types/sales";
import { daysFromToday, relativeDay } from "@/modules/crm/lib/format";

// ─── Sub-navigation ──────────────────────────────────────────────────────────

const CRM_TABS = [
  { href: "/sales",               label: "Dashboard" },
  { href: "/sales/agenda",        label: "Agenda" },
  { href: "/sales/accounts",      label: "Accounts" },
  { href: "/sales/opportunities", label: "Opportunities" },
  { href: "/sales/leads",         label: "Leads" },
  { href: "/sales/activity",      label: "Activity Log" },
];

export function CrmSubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-1 w-fit max-w-full">
      {CRM_TABS.map((t) => {
        // "/sales" is the dashboard; every other tab also owns its sub-pages.
        const active = t.href === "/sales" ? pathname === "/sales" : pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="space-y-4">
      <CrmSubNav />
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────────

export const STAGE_COLORS: Record<OppStage, string> = {
  Prospecting:   "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Qualifying:    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Proposal:      "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "Closed Won":  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Closed Lost": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function StageBadge({ stage }: { stage: OppStage }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", STAGE_COLORS[stage])}>{stage}</span>;
}

const STATUS_COLORS: Record<string, string> = {
  Prospect:          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Customer:          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Former Customer": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Partner:           "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  New:               "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  Working:           "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Qualified:         "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Disqualified:      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Converted:         "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

export function StatusBadge({ status }: { status: AccountStatus | LeadStatus | string }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_COLORS[status] ?? STATUS_COLORS.Prospect)}>{status}</span>;
}

export function PriorityDot({ priority }: { priority: TaskPriority }) {
  const color = priority === "High" ? "bg-red-500" : priority === "Low" ? "bg-slate-300 dark:bg-slate-600" : "bg-blue-500";
  return <span title={`${priority} priority`} className={cn("inline-block h-2 w-2 shrink-0 rounded-full", color)} />;
}

/** Date chip that turns amber when due soon and red when overdue. */
export function DueChip({ iso, className }: { iso: string | null | undefined; className?: string }) {
  if (!iso) return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  const d = daysFromToday(iso) ?? 0;
  const tone =
    d < 0 ? "text-red-600 dark:text-red-400 font-medium" :
    d <= 2 ? "text-amber-600 dark:text-amber-400 font-medium" :
    "text-muted-foreground";
  return <span className={cn("text-xs whitespace-nowrap", tone, className)}>{relativeDay(iso)}</span>;
}

// ─── Cards ───────────────────────────────────────────────────────────────────

export function Kpi({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "warn" | "good" }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-3 sm:p-4">
      <div className="truncate text-xs text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-1 truncate text-xl font-bold tabular-nums sm:text-2xl",
        tone === "warn" && "text-amber-600 dark:text-amber-400",
        tone === "good" && "text-emerald-600 dark:text-emerald-400",
      )}>{value}</div>
      {sub && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className }: { title: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-xl border bg-card", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-8 text-center text-sm text-muted-foreground">{children}</div>;
}

// ─── Form controls ───────────────────────────────────────────────────────────

const control = "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(control, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(control, "resize-y", props.className)} />;
}

/** Filter-bar sized select. */
export function FilterSelect({ value, onChange, children, label }: { value: string; onChange: (v: string) => void; children: ReactNode; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {children}
    </select>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:h-8 sm:w-56 sm:text-xs"
    />
  );
}

/**
 * Owner dropdown backed by the portal's user list. Value is the user's name, which is
 * the owner key the sales tables already use; `extra` keeps a legacy/non-user name selectable.
 */
export function OwnerSelect({
  value, onChange, allowEmpty = true, emptyLabel = "Unassigned", disabled,
}: {
  value: string;
  onChange: (name: string, id: string | null) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const { users } = useUsersContext();
  const active = users.filter((u) => u.isActive).sort((a, b) => a.name.localeCompare(b.name));
  const known = active.some((u) => u.name === value);
  return (
    <Select
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const u = active.find((x) => x.name === e.target.value);
        onChange(e.target.value, u?.id ?? null);
      }}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {value && !known && <option value={value}>{value}</option>}
      {active.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
    </Select>
  );
}

export function PrimaryButton({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn("inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50", className)}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn("inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50", className)}
    >
      {children}
    </button>
  );
}

/** Minimal Markdown renderer for AI summaries: headings, bullets, bold, paragraphs. */
export function MiniMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(<ul key={`ul${blocks.length}`} className="list-disc space-y-1 pl-5">{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
      list = [];
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) { list.push(bullet[1]); continue; }
    flush();
    if (!line.trim()) continue;
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) blocks.push(<h3 key={`h${blocks.length}`} className="mt-3 text-sm font-semibold first:mt-0">{inline(h[2])}</h3>);
    else blocks.push(<p key={`p${blocks.length}`}>{inline(line)}</p>);
  }
  flush();
  return <div className="space-y-2 text-sm leading-relaxed">{blocks}</div>;
}

function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> :
    part.startsWith("_") && part.endsWith("_") && part.length > 2 ? <em key={i}>{part.slice(1, -1)}</em> :
    part,
  );
}

export function CompanyLogo({ name, domain, size = 28 }: { name: string; domain?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (domain?.trim() && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain.trim().toLowerCase())}&sz=64`}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-md border bg-white object-contain p-0.5"
      />
    );
  }
  return (
    <div style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="flex shrink-0 items-center justify-center rounded-md bg-primary/10 font-bold text-primary">
      {initials}
    </div>
  );
}
