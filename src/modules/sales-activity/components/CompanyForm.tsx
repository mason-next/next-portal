"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { SalesCompany } from "@/types/sales";

interface ClearbitSuggestion {
  name: string;
  domain: string;
  logo: string;
}

interface CompanyFormProps {
  initial?: Partial<SalesCompany>;
  onSave: (data: Omit<SalesCompany, "id" | "createdAt" | "updatedAt" | "opportunities"> & { id?: string }) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function CompanyForm({ initial, onSave, onDelete, onCancel }: CompanyFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [domain, setDomain] = useState(initial?.domain ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [suggestions, setSuggestions] = useState<ClearbitSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditing = Boolean(initial?.id);

  useEffect(() => {
    if (isEditing) return;
    if (name.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/sales/logo-suggest?query=${encodeURIComponent(name.trim())}`
        );
        if (!res.ok) return;
        const data: ClearbitSuggestion[] = await res.json();
        setSuggestions(data.slice(0, 5));
        setShowSuggestions(data.length > 0);
      } catch {
        // best-effort — silently ignore network errors
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [name, isEditing]);

  function pickSuggestion(s: ClearbitSuggestion) {
    setName(s.name);
    setDomain(s.domain);
    setShowSuggestions(false);
    setSuggestions([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      ...(initial?.id ? { id: initial.id } : {}),
      name: name.trim(),
      domain: domain.trim().toLowerCase(),
      notes,
      dealDeskId: initial?.dealDeskId ?? null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {/* Company name with autocomplete */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Company Name *</span>
          <div className="relative">
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              required
              autoComplete="off"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="City of Coral Gables"
            />

            {showSuggestions && suggestions.length > 0 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border bg-card shadow-lg overflow-hidden">
                  {suggestions.map((s) => (
                    <button
                      key={s.domain}
                      type="button"
                      onClick={() => pickSuggestion(s)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                    >
                      <Image
                        src={s.logo}
                        alt={s.name}
                        width={20}
                        height={20}
                        className="rounded object-contain shrink-0"
                        unoptimized
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-none truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{s.domain}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Website Domain</span>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="coralgables.com"
          />
          <p className="text-xs text-muted-foreground">Auto-filled when you pick a suggestion above</p>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Background, key contacts, context…"
          />
        </label>
      </div>

      <div className="flex items-center justify-between pt-1">
        {onDelete ? (
          <button
            type="button"
            onClick={() => confirm(`Remove ${initial?.name ?? "this company"} and all its opportunities?`) && onDelete()}
            className="text-xs text-destructive hover:underline"
          >
            Delete company
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            {initial?.id ? "Save Changes" : "Add Company"}
          </button>
        </div>
      </div>
    </form>
  );
}
