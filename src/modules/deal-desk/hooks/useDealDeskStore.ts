"use client";

import { useCallback, useEffect, useState } from "react";
import { getDealDeskQuotes, saveDealDeskQuote, deleteDealDeskQuote } from "@/lib/data/deal-desk";
import type { DealDeskQuote, DealStatus, CommissionStatus } from "@/types/deal-desk";
import { useSession } from "@/lib/auth/client";

function nowIso(): string {
  return new Date().toISOString();
}

export function useDealDeskStore() {
  const { name: currentUserName } = useSession();
  const [quotes, setQuotes] = useState<DealDeskQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    getDealDeskQuotes().then((data) => {
      if (active) {
        setQuotes(data);
        setIsLoading(false);
      }
    });
    return () => { active = false; };
  }, [reloadToken]);

  const bump = useCallback(() => setReloadToken((t) => t + 1), []);

  const upsert = useCallback(async (quote: DealDeskQuote) => {
    await saveDealDeskQuote(quote);
    bump();
  }, [bump]);

  const remove = useCallback(async (id: string) => {
    await deleteDealDeskQuote(id);
    bump();
  }, [bump]);

  const updateStatus = useCallback(async (id: string, status: DealStatus, comment: string) => {
    const all = await getDealDeskQuotes();
    const quote = all.find((q) => q.id === id);
    if (!quote) return;
    const updated: DealDeskQuote = {
      ...quote,
      status,
      updatedAt: nowIso(),
      approvalHistory: [
        ...quote.approvalHistory,
        { id: crypto.randomUUID(), status, user: currentUserName, comment, timestamp: nowIso() },
      ],
      auditLog: [
        ...quote.auditLog,
        {
          id: crypto.randomUUID(),
          action: "Approval status changed",
          detail: `Status set to "${status}". ${comment ? `Comment: ${comment}` : ""}`.trim(),
          user: currentUserName,
          timestamp: nowIso(),
        },
      ],
    };
    await saveDealDeskQuote(updated);
    bump();
  }, [bump, currentUserName]);

  const updateCommissionStatus = useCallback(async (id: string, commissionStatus: CommissionStatus) => {
    const all = await getDealDeskQuotes();
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
          user: currentUserName,
          timestamp: nowIso(),
        },
      ],
    };
    await saveDealDeskQuote(updated);
    bump();
  }, [bump, currentUserName]);

  const updateNotes = useCallback(async (id: string, executiveNotes: string) => {
    const all = await getDealDeskQuotes();
    const quote = all.find((q) => q.id === id);
    if (!quote) return;
    await saveDealDeskQuote({ ...quote, executiveNotes, updatedAt: nowIso() });
    bump();
  }, [bump]);

  return {
    quotes,
    isLoading,
    reload: bump,
    upsert,
    remove,
    updateStatus,
    updateCommissionStatus,
    updateNotes,
  };
}
