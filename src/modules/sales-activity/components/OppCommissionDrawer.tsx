"use client";

import { useEffect, useState } from "react";
import { DollarSign, X, Plus, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getOppInvoices,
  upsertOppInvoice,
  deleteOppInvoice,
  updateOppCommissionTeam,
} from "@/lib/data/sales-activity";
import type { SalesOpportunity, SalesOppInvoice, CommissionTeamMember, OppInvoiceStatus } from "@/types/sales";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  opp: SalesOpportunity | null;
  onClose: () => void;
}

type Tab = "team" | "invoices";

// ─── Invoice form ─────────────────────────────────────────────────────────────

const EMPTY_INVOICE = {
  invoiceNumber: "",
  invoiceDate: "",
  subtotalCents: 0,
  salesTaxCents: 0,
  openBalanceCents: 0,
  paymentStatus: "Outstanding" as OppInvoiceStatus,
  paymentDate: "",
  appliesToOppId: "",
  notes: "",
};

function InvoiceForm({
  initial,
  opportunityId,
  onSave,
  onCancel,
}: {
  initial?: SalesOppInvoice | null;
  opportunityId: string;
  onSave: (inv: SalesOppInvoice) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    invoiceNumber: initial?.invoiceNumber ?? "",
    invoiceDate: initial?.invoiceDate ? initial.invoiceDate.slice(0, 10) : "",
    subtotalCents: initial ? initial.subtotalCents / 100 : 0,
    salesTaxCents: initial ? initial.salesTaxCents / 100 : 0,
    openBalanceCents: initial ? initial.openBalanceCents / 100 : 0,
    paymentStatus: initial?.paymentStatus ?? ("Outstanding" as OppInvoiceStatus),
    paymentDate: initial?.paymentDate ? initial.paymentDate.slice(0, 10) : "",
    notes: initial?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.invoiceDate) { setError("Invoice date is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const saved = await upsertOppInvoice({
        id: initial?.id,
        opportunityId,
        invoiceNumber: form.invoiceNumber,
        invoiceDate: form.invoiceDate,
        subtotalCents: Math.round(form.subtotalCents * 100),
        salesTaxCents: Math.round(form.salesTaxCents * 100),
        openBalanceCents: Math.round(form.openBalanceCents * 100),
        paymentStatus: form.paymentStatus,
        paymentDate: form.paymentDate || null,
        appliesToOppId: null,
        notes: form.notes,
      });
      onSave(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, node: React.ReactNode) => (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {node}
    </label>
  );

  const inp = (opts: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" {...opts} />
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {field("Invoice #", inp({ value: form.invoiceNumber, onChange: (e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value })), placeholder: "INV-001" }))}
        {field("Invoice Date *", inp({ type: "date", value: form.invoiceDate, onChange: (e) => setForm((f) => ({ ...f, invoiceDate: e.target.value })) }))}
        {field("Subtotal ($)", inp({ type: "number", step: "0.01", value: form.subtotalCents, onChange: (e) => setForm((f) => ({ ...f, subtotalCents: parseFloat(e.target.value) || 0 })) }))}
        {field("Open Balance ($)", inp({ type: "number", step: "0.01", value: form.openBalanceCents, onChange: (e) => setForm((f) => ({ ...f, openBalanceCents: parseFloat(e.target.value) || 0 })) }))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("Payment Status", (
          <select
            value={form.paymentStatus}
            onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value as OppInvoiceStatus }))}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="Outstanding">Outstanding</option>
            <option value="Paid">Paid</option>
          </select>
        ))}
        {field("Payment Date", inp({ type: "date", value: form.paymentDate, onChange: (e) => setForm((f) => ({ ...f, paymentDate: e.target.value })) }))}
      </div>
      {field("Notes", (
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : "Save Invoice"}
        </button>
      </div>
    </form>
  );
}

// ─── Team member form ─────────────────────────────────────────────────────────

function TeamMemberForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CommissionTeamMember | null;
  onSave: (m: CommissionTeamMember) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState<CommissionTeamMember["role"]>(initial?.role ?? "bd");
  const [rateBps, setRateBps] = useState(initial ? initial.rateBps / 100 : 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ userId: initial?.userId ?? null, name: name.trim(), role, rateBps: Math.round(rateBps * 100) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1 col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value as CommissionTeamMember["role"])} className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="director">Director</option>
            <option value="bd">Business Dev</option>
            <option value="de">Design Engineer</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Rate (%)</span>
          <input type="number" step="0.01" value={rateBps} onChange={(e) => setRateBps(parseFloat(e.target.value) || 0)} className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">Cancel</button>
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Save</button>
      </div>
    </form>
  );
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

export function OppCommissionDrawer({ opp, onClose }: Props) {
  const open = opp !== null;
  const [tab, setTab] = useState<Tab>("team");

  // Commission team state
  const [team, setTeam] = useState<CommissionTeamMember[]>([]);
  const [teamSaving, setTeamSaving] = useState(false);
  const [editingMember, setEditingMember] = useState<{ idx: number | null; member: CommissionTeamMember | null } | null>(null);

  // Invoice state
  const [invoices, setInvoices] = useState<SalesOppInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SalesOppInvoice | null | "new">(null);

  useEffect(() => {
    if (!opp) { setTeam([]); setInvoices([]); return; }
    setTeam((opp.commissionTeam ?? []) as CommissionTeamMember[]);
    setInvoicesLoading(true);
    getOppInvoices(opp.id).then(setInvoices).catch(() => setInvoices([])).finally(() => setInvoicesLoading(false));
  }, [opp]);

  async function saveMember(m: CommissionTeamMember, idx: number | null) {
    const next = idx === null ? [...team, m] : team.map((x, i) => i === idx ? m : x);
    setTeam(next);
    setEditingMember(null);
    setTeamSaving(true);
    try { await updateOppCommissionTeam(opp!.id, next); } finally { setTeamSaving(false); }
  }

  async function removeMember(idx: number) {
    const next = team.filter((_, i) => i !== idx);
    setTeam(next);
    setTeamSaving(true);
    try { await updateOppCommissionTeam(opp!.id, next); } finally { setTeamSaving(false); }
  }

  async function handleDeleteInvoice(id: string) {
    await deleteOppInvoice(id);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  }

  const ROLE_LABELS: Record<CommissionTeamMember["role"], string> = {
    director: "Director", bd: "Business Dev", de: "Design Engineer", custom: "Custom",
  };

  const STATUS_STYLE: Record<string, string> = {
    Outstanding: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    Paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  };

  function fmtUSD(cents: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
  }

  function fmtDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  return (
    <>
      <div
        className={cn("fixed inset-0 z-40 bg-black/30 transition-opacity", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-full sm:max-w-lg flex-col border-l bg-card shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Commission & Invoices"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-semibold">Commission & Invoices</span>
            </div>
            {opp?.name && <p className="mt-0.5 truncate text-xs text-muted-foreground">{opp.name}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-5">
          {(["team", "invoices"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "py-2.5 px-1 mr-5 text-sm font-medium border-b-2 transition-colors",
                tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "team" ? "Commission Team" : "Invoices"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Commission Team tab */}
          {tab === "team" && (
            <div className="space-y-4">
              {editingMember !== null ? (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-semibold mb-3">{editingMember.idx === null ? "Add Team Member" : "Edit Team Member"}</p>
                  <TeamMemberForm
                    initial={editingMember.member}
                    onSave={(m) => saveMember(m, editingMember.idx)}
                    onCancel={() => setEditingMember(null)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setEditingMember({ idx: null, member: null })}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Member
                </button>
              )}

              {team.length === 0 ? (
                <p className="text-sm text-muted-foreground">No commission team members yet.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {team.map((m, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{ROLE_LABELS[m.role]} · {(m.rateBps / 100).toFixed(2)}%</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingMember({ idx: i, member: m })} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeMember(i)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {teamSaving && <p className="text-xs text-muted-foreground">Saving…</p>}
            </div>
          )}

          {/* Invoices tab */}
          {tab === "invoices" && (
            <div className="space-y-4">
              {editingInvoice !== null ? (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-semibold mb-3">{editingInvoice === "new" ? "Add Invoice" : "Edit Invoice"}</p>
                  <InvoiceForm
                    initial={editingInvoice === "new" ? null : editingInvoice}
                    opportunityId={opp!.id}
                    onSave={(inv) => {
                      setInvoices((prev) => {
                        const idx = prev.findIndex((i) => i.id === inv.id);
                        return idx >= 0 ? prev.map((i) => i.id === inv.id ? inv : i) : [...prev, inv];
                      });
                      setEditingInvoice(null);
                    }}
                    onCancel={() => setEditingInvoice(null)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setEditingInvoice("new")}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Invoice
                </button>
              )}

              {invoicesLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices yet.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {inv.invoiceNumber && <span className="text-sm font-medium">{inv.invoiceNumber}</span>}
                          <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLE[inv.paymentStatus] ?? "bg-muted text-muted-foreground")}>
                            {inv.paymentStatus}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setEditingInvoice(inv)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => { if (confirm("Delete this invoice?")) handleDeleteInvoice(inv.id); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{fmtDate(inv.invoiceDate)}</span>
                        <span>Subtotal: <span className="font-medium text-foreground">{fmtUSD(inv.subtotalCents)}</span></span>
                        {inv.openBalanceCents > 0 && <span>Balance: <span className="font-medium text-amber-600">{fmtUSD(inv.openBalanceCents)}</span></span>}
                      </div>
                      {inv.notes && <p className="text-xs text-muted-foreground">{inv.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
