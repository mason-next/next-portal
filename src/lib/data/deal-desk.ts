import { readGlobal, writeGlobal } from "@/lib/storage/local-store";
import type { DealDeskQuote } from "@/types/deal-desk";

const STORE_KEY = "deal-desk:quotes";

export function getDealDeskQuotes(): DealDeskQuote[] {
  return readGlobal<DealDeskQuote[]>(STORE_KEY) ?? [];
}

export function getDealDeskQuote(id: string): DealDeskQuote | null {
  return getDealDeskQuotes().find((q) => q.id === id) ?? null;
}

export function saveDealDeskQuote(quote: DealDeskQuote): void {
  const all = getDealDeskQuotes();
  const idx = all.findIndex((q) => q.id === quote.id);
  if (idx >= 0) {
    all[idx] = quote;
  } else {
    all.unshift(quote);
  }
  writeGlobal(STORE_KEY, all);
}

export function deleteDealDeskQuote(id: string): void {
  const filtered = getDealDeskQuotes().filter((q) => q.id !== id);
  writeGlobal(STORE_KEY, filtered);
}
