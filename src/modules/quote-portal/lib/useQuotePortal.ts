"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getQuotePresentations,
  createQuotePresentation,
  toggleQuoteActive,
  deleteQuotePresentation,
  getQuoteAccessLogs,
} from "@/lib/data/quote-portal";
import type { QuotePresentation, QuoteAccessLog } from "@/types/sales";

export function useQuotePortal() {
  const [quotes, setQuotes] = useState<QuotePresentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const bump = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    getQuotePresentations().then((data) => {
      if (active) { setQuotes(data); setIsLoading(false); }
    });
    return () => { active = false; };
  }, [reloadToken]);

  const create = useCallback(async (data: { slug: string; title: string; customer: string; createdBy: string }) => {
    await createQuotePresentation(data);
    bump();
  }, [bump]);

  const toggle = useCallback(async (id: string) => {
    await toggleQuoteActive(id);
    bump();
  }, [bump]);

  const remove = useCallback(async (id: string) => {
    await deleteQuotePresentation(id);
    bump();
  }, [bump]);

  const getLogs = useCallback(async (quoteId: string): Promise<QuoteAccessLog[]> => {
    return getQuoteAccessLogs(quoteId);
  }, []);

  return { quotes, isLoading, create, toggle, remove, getLogs, bump };
}
