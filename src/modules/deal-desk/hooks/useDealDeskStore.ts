"use client";

import { useCallback, useEffect, useState } from "react";
import { getDealDeskQuotes, saveDealDeskQuote, deleteDealDeskQuote } from "@/lib/data/deal-desk";
import type { DealDeskQuote, DealStatus, CommissionStatus } from "@/types/deal-desk";
import { CURRENT_USER } from "@/lib/current-user";

function nowIso(): string {
  return new Date().toISOString();
}

export function useDealDeskStore() {
  const [quotes, setQuotes] = useState<DealDeskQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => {
    setQuotes(getDealDeskQuotes());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(reload);
  }, [reload]);

  const upsert = useCallback(
    (quote: DealDeskQuote) => {
      saveDealDeskQuote(quote);
      reload();
    },
    [reload]
  );

  const remove = useCallback(
    (id: string) => {
      deleteDealDeskQuote(id);
      reload();
    },
    [reload]
  );

  const updateStatus = useCallback(
    (id: string, status: DealStatus, comment: string) => {
      const all = getDealDeskQuotes();
      const quote = all.find((q) => q.id === id);
      if (!quote) return;
      const updated: DealDeskQuote = {
        ...quote,
        status,
        updatedAt: nowIso(),
        approvalHistory: [
          ...quote.approvalHistory,
          { id: crypto.randomUUID(), status, user: CURRENT_USER, comment, timestamp: nowIso() },
        ],
        auditLog: [
          ...quote.auditLog,
          {
            id: crypto.randomUUID(),
            action: "Approval status changed",
            detail: `Status set to "${status}". ${comment ? `Comment: ${comment}` : ""}`.trim(),
            user: CURRENT_USER,
            timestamp: nowIso(),
          },
        ],
      };
      saveDealDeskQuote(updated);
      reload();
    },
    [reload]
  );

  const updateCommissionStatus = useCallback(
    (id: string, commissionStatus: CommissionStatus) => {
      const all = getDealDeskQuotes();
      const quote = all.find((q) => q.id === id);
      if (!quote) return;
      const updated: DealDeskQuote = {
        ...quote,
        commissionStatus,
        updatedAt: nowIso(),
        auditLog: [
          ...quote.auditLog,
          {
            id: crypto.randomUUID(),
            action: "Commission status changed",
            detail: `Commission status set to "${commissionStatus}".`,
            user: CURRENT_USER,
            timestamp: nowIso(),
          },
        ],
      };
      saveDealDeskQuote(updated);
      reload();
    },
    [reload]
  );

  const updateNotes = useCallback(
    (id: string, executiveNotes: string) => {
      const all = getDealDeskQuotes();
      const quote = all.find((q) => q.id === id);
      if (!quote) return;
      saveDealDeskQuote({ ...quote, executiveNotes, updatedAt: nowIso() });
      reload();
    },
    [reload]
  );

  return {
    quotes,
    isLoading,
    reload,
    upsert,
    remove,
    updateStatus,
    updateCommissionStatus,
    updateNotes,
  };
}
