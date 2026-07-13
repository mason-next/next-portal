"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/modules/deal-desk/components/KpiCards";
import { QuoteTable } from "@/modules/deal-desk/components/QuoteTable";
import { ImportModal } from "@/modules/deal-desk/components/ImportModal";
import { useDealDeskStore } from "@/modules/deal-desk/hooks/useDealDeskStore";
import { useDealDeskUser } from "@/modules/deal-desk/hooks/useDealDeskUser";
import type { DealDeskQuote } from "@/types/deal-desk";

export default function DealDeskPage() {
  const { quotes, isLoading, upsert, remove } = useDealDeskStore();
  const { userName, isManagement } = useDealDeskUser();
  const [showImport, setShowImport] = useState(false);

  // Salesperson view: only show quotes where the user is on the team
  const visibleQuotes = useMemo(() => {
    if (isManagement) return quotes;
    return quotes.filter(
      (q) => q.salesperson === userName || q.team.some((m) => m.name === userName)
    );
  }, [quotes, userName, isManagement]);

  function handleImported(quote: DealDeskQuote) {
    upsert(quote);
    setShowImport(false);
  }

  return (
    <div className="mx-auto max-w-7xl p-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/sales" className="hover:text-foreground">Sales</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Deal Desk</span>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Deal Desk</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Profitability, commissions & executive reporting</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/sales/deal-desk/my-commissions">
            <Button variant="outline">My Commissions</Button>
          </Link>
          {isManagement && (
            <Link href="/sales/deal-desk/commission-report">
              <Button variant="outline">Commission Report</Button>
            </Link>
          )}
          {isManagement && (
            <Button onClick={() => setShowImport(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" x2="12" y1="3" y2="15"/>
              </svg>
              Upload Data
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <KpiCards quotes={visibleQuotes} />
          <QuoteTable quotes={visibleQuotes} onDelete={isManagement ? remove : undefined} basePath="/sales/deal-desk" />
        </>
      )}

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImported={handleImported} />
      )}
    </div>
  );
}
