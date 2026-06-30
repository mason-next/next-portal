"use client";

import { useEffect, useState } from "react";
import type { SalesCompany, SalesActivity, SalesContact } from "@/types/sales";
import { ACTIVITY_TYPES, getWeekStart } from "@/types/sales";
import type { AppUser } from "@/types/user";
import { UserPicker } from "@/components/shared/UserPicker";

interface ActivityLogFormProps {
  companies: SalesCompany[];
  currentUser: string;
  isManagement?: boolean;
  editing?: SalesActivity;
  /** The week currently selected in the week nav — used as default for new activities */
  defaultWeekStart?: string;
  onSubmit: (activity: Omit<SalesActivity, "id" | "createdAt" | "company" | "opportunity">) => void;
  onCancel?: () => void;
  prefill?: {
    type?: SalesActivity["type"];
    description?: string;
    contacts?: SalesContact[];
    companyId?: string;
    opportunityId?: string;
    aiGenerated?: boolean;
    activityDate?: string; // YYYY-MM-DD
    repUserId?: string;
    repUserName?: string;
  };
}

function toLocalDateString(d: Date) {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

export function ActivityLogForm({
  companies, currentUser, isManagement, editing, defaultWeekStart, onSubmit, onCancel, prefill,
}: ActivityLogFormProps) {
  const initialCompanyId =
    editing?.companyId ??
    (editing?.opportunity ? editing.opportunity.company.id : null) ??
    prefill?.companyId ??
    "";

  // Activity date: editing uses its weekStart Monday as a proxy,
  // new activities default to today (or prefill date if provided)
  const initialDate = editing
    ? toLocalDateString(new Date(editing.weekStart))
    : (prefill?.activityDate ?? (defaultWeekStart ? toLocalDateString(new Date(defaultWeekStart + "T12:00:00")) : toLocalDateString(new Date())));

  const [type, setType] = useState<SalesActivity["type"]>(editing?.type ?? prefill?.type ?? "Call");
  const [description, setDescription] = useState(editing?.description ?? prefill?.description ?? "");
  const [activityDate, setActivityDate] = useState(initialDate);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [opportunityId, setOpportunityId] = useState(editing?.opportunityId ?? prefill?.opportunityId ?? "");
  const [contacts, setContacts] = useState<SalesContact[]>(editing?.contacts ?? prefill?.contacts ?? []);
  const [newContactName, setNewContactName] = useState("");
  const [newContactTitle, setNewContactTitle] = useState("");

  // Rep picker: management can log on behalf of any user
  const [repUserId, setRepUserId] = useState<string>(
    editing?.userId ?? prefill?.repUserId ?? ""
  );
  const [repUserName, setRepUserName] = useState<string>(
    editing?.userName ?? prefill?.repUserName ?? currentUser
  );
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    if (!isManagement) return;
    fetch("/api/users").then((r) => r.json()).then(setAllUsers).catch(() => {});
  }, [isManagement]);

  const selectedCompany = companies.find((c) => c.id === companyId);
  const oppsForCompany = selectedCompany?.opportunities ?? [];

  function handleCompanyChange(id: string) {
    setCompanyId(id);
    setOpportunityId(""); // reset opp when company changes
  }

  function handleRepChange(user: AppUser | null) {
    setRepUserId(user?.id ?? "");
    setRepUserName(user?.name ?? currentUser);
  }

  function addContact() {
    if (!newContactName.trim()) return;
    setContacts((prev) => [...prev, { name: newContactName.trim(), title: newContactTitle.trim() }]);
    setNewContactName("");
    setNewContactTitle("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Compute weekStart from the selected activity date
    const weekStart = activityDate
      ? getWeekStart(new Date(activityDate + "T12:00:00")) // noon avoids midnight UTC-offset issues
      : (defaultWeekStart ?? getWeekStart());
    onSubmit({
      userId: repUserId || editing?.userId || null,
      userName: repUserName || editing?.userName || currentUser,
      companyId: companyId || null,
      opportunityId: opportunityId || null,
      type,
      description,
      contacts,
      aiGenerated: editing?.aiGenerated ?? prefill?.aiGenerated ?? false,
      weekStart,
    });
    if (!editing) {
      setDescription("");
      setContacts([]);
      setCompanyId("");
      setOpportunityId("");
      setActivityDate(toLocalDateString(new Date()));
    }
  }

  const isEditing = !!editing;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 space-y-4">
      {!isEditing && <h3 className="text-sm font-semibold">Log Activity</h3>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* Type */}
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as SalesActivity["type"])}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        {/* Activity date */}
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Date</span>
          <input
            type="date"
            value={activityDate}
            onChange={(e) => setActivityDate(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        {/* Rep — management only */}
        {isManagement && (
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Sales Rep</span>
            <UserPicker
              value={repUserId}
              onChange={handleRepChange}
              users={allUsers}
              placeholder="Select rep…"
            />
          </label>
        )}

        {/* Company */}
        <label className={`space-y-1 ${isManagement ? "col-span-2 sm:col-span-2" : "col-span-2"}`}>
          <span className="text-xs font-medium text-muted-foreground">Company</span>
          <select
            value={companyId}
            onChange={(e) => handleCompanyChange(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— No specific company —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        {/* Opportunity — only shown when a company is selected and it has opps */}
        {companyId && oppsForCompany.length > 0 && (
          <label className="space-y-1 col-span-2 sm:col-span-3">
            <span className="text-xs font-medium text-muted-foreground">Opportunity <span className="text-muted-foreground/60">(optional)</span></span>
            <select
              value={opportunityId}
              onChange={(e) => setOpportunityId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— General engagement —</option>
              {oppsForCompany.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </label>
        )}

        {/* Notes */}
        <label className="space-y-1 col-span-2 sm:col-span-3">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={7}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            placeholder="What was discussed, key takeaways, action items…"
          />
        </label>
      </div>

      {/* Contacts */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Contacts</span>
        {contacts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {contacts.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                <span className="font-medium">{c.name}</span>
                {c.title && <span className="text-muted-foreground">· {c.title}</span>}
                <button type="button" onClick={() => setContacts((p) => p.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive ml-0.5">✕</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={newContactName}
            onChange={(e) => setNewContactName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addContact(); } }}
            placeholder="Contact name"
            className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={newContactTitle}
            onChange={(e) => setNewContactTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addContact(); } }}
            placeholder="Title (optional)"
            className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="button" onClick={addContact} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors shrink-0">+ Add</button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
        )}
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          {isEditing ? "Save Changes" : "Log Activity"}
        </button>
      </div>
    </form>
  );
}
