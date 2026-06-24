"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDealDeskQuote } from "@/lib/data/deal-desk";
import { saveDealDeskQuote } from "@/lib/data/deal-desk";
import { calcFinancials, fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import { DealReport } from "@/modules/deal-desk/components/DealReport";
import { CommissionPanel } from "@/modules/deal-desk/components/CommissionPanel";
import { SankeyPanel } from "@/modules/deal-desk/components/SankeyPanel";
import { ApprovalPanel } from "@/modules/deal-desk/components/ApprovalPanel";
import type { DealDeskQuote, DealStatus, CommissionStatus } from "@/types/deal-desk";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  Pending:  "bg-amber-100 text-amber-800",
  Approved: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

type Tab = "report" | "commissions" | "sankey" | "approval";

export default function QuoteDetailPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = use(params);
  const router = useRouter();
  const [quote, setQuote] = useState<DealDeskQuote | null>(null);
  const [tab, setTab] = useState<Tab>("report");

  useEffect(() => {
    queueMicrotask(() => {
      const q = getDealDeskQuote(quoteId);
      if (!q) { router.replace("/deal-desk"); return; }
      setQuote(q);
    });
  }, [quoteId, router]);

  function persist(updated: DealDeskQuote) {
    saveDealDeskQuote({ ...updated, updatedAt: new Date().toISOString() });
    setQuote(updated);
  }

  function handleStatusChange(status: DealStatus, comment: string) {
    if (!quote) return;
    persist({
      ...quote,
      status,
      approvalHistory: [
        ...quote.approvalHistory,
        { id: crypto.randomUUID(), status, user: "Current User", comment, timestamp: new Date().toISOString() },
      ],
      auditLog: [
        ...quote.auditLog,
        { id: crypto.randomUUID(), action: "Approval updated", detail: `Status → ${status}${comment ? `. ${comment}` : ""}`, user: "Current User", timestamp: new Date().toISOString() },
      ],
    });
  }

  function handleCommissionStatusChange(commissionStatus: CommissionStatus) {
    if (!quote) return;
    persist({
      ...quote,
      commissionStatus,
      auditLog: [
        ...quote.auditLog,
        { id: crypto.randomUUID(), action: "Commission status updated", detail: `Commission status → ${commissionStatus}`, user: "Current User", timestamp: new Date().toISOString() },
      ],
    });
  }

  function handleNotesChange(executiveNotes: string) {
    if (!quote) return;
    persist({ ...quote, executiveNotes });
  }

  if (!quote) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  const f = calcFinancials(quote.categories);

  const tabs: { id: Tab; label: string }[] = [
    { id: "report",      label: "Deal Report" },
    { id: "commissions", label: "Commissions" },
    { id: "sankey",      label: "Sankey Export" },
    { id: "approval",    label: "Approval" },
  ];

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-6">
      {/* Back nav */}
      <Link href="/deal-desk" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        ← Deal Desk
      </Link>

      {/* Header card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">{quote.projectName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {quote.customer} · {quote.quoteNumber} {quote.revision} · {quote.projectType}
            </p>
          </div>
          <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold", STATUS_TONE[quote.status] ?? "bg-muted")}>
            {quote.status}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Revenue",      value: fmtUSD(f.revenueCents) },
            { label: "Gross Profit", value: fmtUSD(f.grossProfitCents) },
            { label: "Margin",       value: fmtPct(f.grossMarginPct, 2) },
            { label: "Commission Pool", value: fmtUSD(f.commissionPoolCents) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-base font-bold mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-1">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "report"      && <DealReport quote={quote} />}
        {tab === "commissions" && <CommissionPanel quote={quote} onCommissionStatusChange={handleCommissionStatusChange} />}
        {tab === "sankey"      && <SankeyPanel quote={quote} />}
        {tab === "approval"    && <ApprovalPanel quote={quote} onStatusChange={handleStatusChange} onNotesChange={handleNotesChange} />}
      </div>
    </div>
  );
}
