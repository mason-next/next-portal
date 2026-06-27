"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/modules/deal-desk/components/KpiCards";
import { QuoteTable } from "@/modules/deal-desk/components/QuoteTable";
import { ImportModal } from "@/modules/deal-desk/components/ImportModal";
import { useDealDeskStore } from "@/modules/deal-desk/hooks/useDealDeskStore";
import { useDealDeskUser } from "@/modules/deal-desk/hooks/useDealDeskUser";
import type { DealDeskQuote, DealDeskRole } from "@/types/deal-desk";

export default function DealDeskPage() {
  const { quotes, isLoading, upsert, remove } = useDealDeskStore();
  const { user, setUser, isManagement } = useDealDeskUser();
  const [showImport, setShowImport] = useState(false);

  const allNames = useMemo(() => {
    const names = new Set<string>();
    for (const q of quotes) for (const m of q.team) if (m.name) names.add(m.name);
    return Array.from(names).sort();
  }, [quotes]);

  const visibleQuotes = useMemo(() => {
    if (isManagement || !user.name) return quotes;
    return quotes.filter((q) => q.team.some((m) => m.name === user.name));
  }, [quotes, user, isManagement]);

  function handleImported(quote: DealDeskQuote) {
    upsert(quote);
    setShowImport(false);
  }

  return (
    <div className="mx-auto max-w-7xl p-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
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
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Viewing as</span>
            <select
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              className="text-sm font-medium bg-transparent focus:outline-none"
            >
              <option value="">— Select —</option>
              {allNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-muted-foreground">·</span>
            <select
              value={user.role}
              onChange={(e) => setUser({ ...user, role: e.target.value as DealDeskRole })}
              className="text-sm bg-transparent focus:outline-none"
            >
              <option value="management">Management</option>
              <option value="salesperson">Salesperson</option>
            </select>
          </div>
          <Link href="/sales/deal-desk/my-commissions">
            <Button variant="outline">My Commissions</Button>
          </Link>
          {isManagement && (
            <Button onClick={() => setShowImport(true)}>⇪ Import Quote</Button>
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
