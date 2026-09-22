"use client";

import { useMemo, useState } from "react";
import { Paperclip, Pin, PinOff, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalesNote, SalesActivity, SalesAuditEntry, SalesOpportunity, CompanyContact } from "@/types/sales";
import { fmtDate } from "@/modules/crm/lib/format";
import { FilterSelect } from "./ui";
import { NoteComposer, type NoteInput } from "./NoteComposer";

type Entry =
  | { type: "note"; date: string; note: SalesNote }
  | { type: "activity"; date: string; activity: SalesActivity }
  | { type: "history"; date: string; entry: SalesAuditEntry };

const KIND_COLORS: Record<string, string> = {
  Note:        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Call:        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Meeting:     "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Email:       "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "Site Visit":"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Demo:        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Internal:    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const FIELD_LABELS: Record<string, string> = {
  stage: "stage", ownerName: "owner", value: "value", closeDate: "close date", probability: "probability",
  forecastCategory: "forecast", nextStep: "next step", nextStepDate: "next step date",
  nextStepOwnerName: "next step owner", accountStatus: "status", territory: "territory", vertical: "vertical",
  name: "name", domain: "domain", leadSource: "lead source", dueDate: "due date", assigneeName: "assignee",
};

function describeHistory(h: SalesAuditEntry, oppName: (id: string | null) => string): string {
  const what = h.entityType === "opportunity" ? `opportunity ${oppName(h.opportunityId) || ""}`.trim() : h.entityType;
  const fmtVal = (f: string, v: string) =>
    !v ? "—" :
    f === "value" ? `$${Math.round(Number(v) / 100).toLocaleString()}` :
    /date/i.test(f) && /^\d{4}-\d{2}-\d{2}T/.test(v) ? fmtDate(v) :
    v;
  switch (h.action) {
    case "created": return `created ${what}${h.newValue ? `: ${h.newValue}` : ""}`;
    case "deleted": return `deleted ${what}${h.oldValue ? `: ${h.oldValue}` : ""}`;
    case "completed": return `completed task: ${h.newValue}`;
    case "reopened": return `reopened task: ${h.newValue}`;
    case "converted": return `converted lead: ${h.newValue}`;
    case "automation": return h.field === "task" ? `automation created follow-up: ${h.newValue}` : `automation set ${FIELD_LABELS[h.field] ?? h.field} → ${h.newValue}`;
    case "stage_changed": return `moved ${what} from ${h.oldValue} → ${h.newValue}`;
    default: return `changed ${what} ${FIELD_LABELS[h.field] ?? h.field}: ${fmtVal(h.field, h.oldValue)} → ${fmtVal(h.field, h.newValue)}`;
  }
}

/**
 * Complete customer history for an account: dated notes/touchpoints, legacy weekly
 * activity entries, and (optionally) system changes, filterable to one opportunity.
 */
export function AccountTimeline({
  notes, activities, history, opportunities, contacts, currentUser, isManager, canEdit,
  onSaveNote, onDeleteNote, onTogglePin,
}: {
  notes: SalesNote[];
  activities: SalesActivity[];
  history: SalesAuditEntry[];
  opportunities: SalesOpportunity[];
  contacts: CompanyContact[];
  currentUser: string;
  isManager: boolean;
  canEdit: boolean;
  onSaveNote: (n: NoteInput) => Promise<unknown>;
  onDeleteNote: (id: string) => Promise<unknown>;
  onTogglePin: (id: string, pinned: boolean) => Promise<unknown>;
}) {
  const [scope, setScope] = useState<string>("all"); // all | company | <oppId>
  const [kind, setKind] = useState<string>("all");
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const oppName = (id: string | null) => opportunities.find((o) => o.id === id)?.name ?? "";

  const entries = useMemo(() => {
    const out: Entry[] = [];
    for (const n of notes) out.push({ type: "note", date: n.noteDate, note: n });
    for (const a of activities) out.push({ type: "activity", date: a.weekStart, activity: a });
    if (showHistory) for (const h of history) if (h.entityType !== "note") out.push({ type: "history", date: h.createdAt, entry: h });

    return out
      .filter((e) => {
        const oppId = e.type === "note" ? e.note.opportunityId : e.type === "activity" ? e.activity.opportunityId : e.entry.opportunityId;
        if (scope === "company" && oppId) return false;
        if (scope !== "all" && scope !== "company" && oppId !== scope) return false;
        if (kind !== "all") {
          if (e.type === "note") return e.note.kind === kind;
          if (e.type === "activity") return e.activity.type === kind;
          return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [notes, activities, history, showHistory, scope, kind]);

  const pinned = notes.filter((n) => n.pinned && (scope === "all" || (scope === "company" ? !n.opportunityId : n.opportunityId === scope)));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <FilterSelect label="Filter by scope" value={scope} onChange={setScope}>
          <option value="all">All notes</option>
          <option value="company">Company notes only</option>
          {opportunities.map((o) => <option key={o.id} value={o.id}>Opp: {o.name}</option>)}
        </FilterSelect>
        <FilterSelect label="Filter by type" value={kind} onChange={setKind}>
          <option value="all">All types</option>
          {["Note", "Call", "Meeting", "Email", "Site Visit", "Demo", "Internal"].map((k) => <option key={k}>{k}</option>)}
        </FilterSelect>
        <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} />
          Show change history
        </label>
      </div>

      {pinned.length > 0 && (
        <div className="border-b bg-amber-50/60 px-4 py-2 dark:bg-amber-950/20">
          {pinned.map((n) => (
            <div key={n.id} className="flex items-start gap-2 py-1 text-sm">
              <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <span className="line-clamp-2">{n.body}</span>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">No notes yet. Log the first touchpoint above.</div>
      ) : (
        <ol className="divide-y">
          {entries.map((e) => {
            if (e.type === "note") {
              const n = e.note;
              const mine = isManager || n.userName === currentUser;
              if (editing === n.id) {
                return (
                  <li key={n.id} className="bg-muted/20 px-4 py-3">
                    <NoteComposer
                      companyId={n.companyId}
                      opportunities={opportunities}
                      contacts={contacts}
                      initial={n}
                      onSave={async (input) => { await onSaveNote(input); setEditing(null); }}
                      onCancel={() => setEditing(null)}
                    />
                  </li>
                );
              }
              return (
                <li key={n.id} className="group flex gap-3 px-4 py-3">
                  <div className="w-16 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-muted-foreground">{fmtDate(n.noteDate, { year: false })}<div className="text-[10px] font-normal">{n.noteDate.slice(0, 4)}</div></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", KIND_COLORS[n.kind] ?? KIND_COLORS.Note)}>{n.kind}</span>
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", n.opportunityId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        {n.opportunityId ? `Opp · ${n.opportunity?.name ?? oppName(n.opportunityId)}` : "Company"}
                      </span>
                      {n.contact && <span className="text-muted-foreground">with {n.contact.name}</span>}
                      <span className="text-muted-foreground">· {n.userName}</span>
                      {n.pinned && <Pin className="h-3 w-3 text-amber-600" />}
                      {canEdit && (
                        <span className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <button type="button" title={n.pinned ? "Unpin" : "Pin to top"} onClick={() => onTogglePin(n.id, !n.pinned)} className="rounded p-1 hover:bg-muted">
                            {n.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                          </button>
                          {mine && (
                            <>
                              <button type="button" title="Edit" onClick={() => setEditing(n.id)} className="rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                              <button type="button" title="Delete" onClick={() => confirm("Delete this note?") && onDeleteNote(n.id)} className="rounded p-1 text-destructive hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    {n.body && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{n.body}</p>}
                    {n.attachments.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {n.attachments.map((a) => (
                          <a key={a.storagePath} href={`/api/comments/serve/${encodeURIComponent(a.storagePath)}`}
                            className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-muted">
                            <Paperclip className="h-3 w-3" />{a.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            }
            if (e.type === "activity") {
              const a = e.activity;
              return (
                <li key={`a_${a.id}`} className="flex gap-3 px-4 py-3">
                  <div className="w-16 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">wk {fmtDate(a.weekStart, { year: false })}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", KIND_COLORS[a.type] ?? KIND_COLORS.Note)}>{a.type}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Activity log</span>
                      {a.opportunity && <span className="text-muted-foreground">Opp · {a.opportunity.name}</span>}
                      <span className="text-muted-foreground">· {a.userName}</span>
                      {a.contacts.length > 0 && <span className="text-muted-foreground">· with {a.contacts.map((c) => c.name).join(", ")}</span>}
                    </div>
                    {a.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.description}</p>}
                  </div>
                </li>
              );
            }
            const h = e.entry;
            return (
              <li key={`h_${h.id}`} className="flex gap-3 px-4 py-1.5">
                <div className="w-16 shrink-0 text-[11px] tabular-nums text-muted-foreground/70">{fmtDate(h.createdAt, { year: false })}</div>
                <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">{h.userName || "System"}</span> {describeHistory(h, oppName)}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
