"use client";

import { useState } from "react";
import Link from "next/link";
import { calcFinancials, fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import type { DealDeskQuote } from "@/types/deal-desk";
import { cn } from "@/lib/utils";

interface QuoteTableProps {
  quotes: DealDeskQuote[];
  onDelete?: (id: string) => void;
}

type SortKey = "projectName" | "customer" | "revenue" | "margin" | "commission" | "importedAt" | "status";
type SortState = { key: SortKey; dir: "asc" | "desc" };

const STATUS_TONE: Record<string, string> = {
  Pending:  "bg-amber-100 text-amber-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

function SortBtn({ k, label, sort, onToggle }: { k: SortKey; label: string; sort: SortState; onToggle: (k: SortKey) => void }) {
  const active = sort.key === k;
  return (
    <button
      type="button"
      onClick={() => onToggle(k)}
      className={cn("flex items-center gap-1 text-xs font-medium whitespace-nowrap", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
    >
      {label}
      {active && <span>{sort.dir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}

export function QuoteTable({ quotes, onDelete }: QuoteTableProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "importedAt", dir: "desc" });

  const filtered = quotes
    .filter((q) => {
      const hay = [q.projectName, q.customer, q.quoteNumber, q.opportunityNumber, q.salesperson].join(" ").toLowerCase();
      return hay.includes(query.toLowerCase());
    })
    .sort((a, b) => {
      const fa = calcFinancials(a.categories);
      const fb = calcFinancials(b.categories);
      const vals: Record<SortKey, string | number> = {
        projectName: a.projectName,
        customer: a.customer,
        revenue: fa.revenueCents,
        margin: fa.grossMarginPct,
        commission: fa.commissionPoolCents,
        importedAt: a.importedAt,
        status: a.status,
      };
      const bvals: Record<SortKey, string | number> = {
        projectName: b.projectName,
        customer: b.customer,
        revenue: fb.revenueCents,
        margin: fb.grossMarginPct,
        commission: fb.commissionPoolCents,
        importedAt: b.importedAt,
        status: b.status,
      };
      const av = vals[sort.key];
      const bv = bvals[sort.key];
      const cmp = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });

  function toggleSort(key: SortKey) {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search customer, project, quote, salesperson…"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No quotes found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left"><SortBtn k="projectName" label="Project" sort={sort} onToggle={toggleSort} /></th>
                <th className="px-4 py-3 text-left"><SortBtn k="customer" label="Customer" sort={sort} onToggle={toggleSort} /></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Quote</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-right"><SortBtn k="revenue" label="Revenue" sort={sort} onToggle={toggleSort} /></th>
                <th className="px-4 py-3 text-right"><SortBtn k="margin" label="Margin" sort={sort} onToggle={toggleSort} /></th>
                <th className="px-4 py-3 text-right"><SortBtn k="commission" label="Commission Pool" sort={sort} onToggle={toggleSort} /></th>
                <th className="px-4 py-3 text-left"><SortBtn k="status" label="Status" sort={sort} onToggle={toggleSort} /></th>
                <th className="px-4 py-3 text-left"><SortBtn k="importedAt" label="Imported" sort={sort} onToggle={toggleSort} /></th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((q) => {
                const f = calcFinancials(q.categories);
                return (
                  <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/deal-desk/${q.id}`} className="hover:text-primary hover:underline">
                        {q.projectName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{q.customer}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {q.quoteNumber} · {q.revision}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{q.projectType}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{fmtUSD(f.revenueCents)}</td>
                    <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", f.grossMarginPct < 20 ? "text-amber-600" : "text-emerald-600")}>
                      {fmtPct(f.grossMarginPct, 1)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmtUSD(f.commissionPoolCents)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_TONE[q.status] ?? "bg-muted text-muted-foreground")}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(q.importedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete "${q.projectName}"?`)) onDelete(q.id);
                          }}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
