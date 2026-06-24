"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/modules/deal-desk/components/KpiCards";
import { QuoteTable } from "@/modules/deal-desk/components/QuoteTable";
import { ImportModal } from "@/modules/deal-desk/components/ImportModal";
import { useDealDeskStore } from "@/modules/deal-desk/hooks/useDealDeskStore";
import type { DealDeskQuote } from "@/types/deal-desk";

export default function DealDeskPage() {
  const { quotes, isLoading, upsert, remove } = useDealDeskStore();
  const [showImport, setShowImport] = useState(false);

  function handleImported(quote: DealDeskQuote) {
    upsert(quote);
    setShowImport(false);
  }

  return (
    <div className="mx-auto max-w-7xl p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Deal Desk</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Profitability, commissions & executive reporting</p>
        </div>
        <Button onClick={() => setShowImport(true)}>⇪ Import Quote</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <KpiCards quotes={quotes} />
          <QuoteTable quotes={quotes} onDelete={remove} />
        </>
      )}

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImported={handleImported} />
      )}
    </div>
  );
}
