"use client";

import { useEffect, useState } from "react";
import type { SalesCompany, CompanyContact } from "@/types/sales";
import { getCompanyContacts, upsertCompanyContact, deleteCompanyContact } from "@/lib/data/sales-activity";

// ── Contact form ──────────────────────────────────────────────────────────────

function ContactForm({
  companyId, initial, onSave, onCancel,
}: {
  companyId: string;
  initial?: CompanyContact;
  onSave: (c: CompanyContact) => void;
  onCancel: () => void;
}) {
  const [name, setName]   = useState(initial?.name   ?? "");
  const [title, setTitle] = useState(initial?.title  ?? "");
  const [email, setEmail] = useState(initial?.email  ?? "");
  const [phone, setPhone] = useState(initial?.phone  ?? "");
  const [notes, setNotes] = useState(initial?.notes  ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const result = await upsertCompanyContact({
        id: initial?.id,
        companyId,
        name, title, email, phone, notes,
      });
      onSave(result);
    } finally {
      setSaving(false);
    }
  }

  const Field = ({ label, value, onChange, type = "text", placeholder = "" }: {
    label: string; value: string; onChange: (v: string) => void;
    type?: string; placeholder?: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Name *" value={name} onChange={setName} placeholder="Jane Smith" />
      <Field label="Title" value={title} onChange={setTitle} placeholder="IT Director" />
      <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="jane@acme.com" />
      <Field label="Phone" value={phone} onChange={setPhone} type="tel" placeholder="+1 (555) 000-0000" />
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Decision maker, preferred contact method, etc."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={!name.trim() || saving}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : initial ? "Save Changes" : "Add Contact"}
        </button>
      </div>
    </form>
  );
}

// ── Contact card ──────────────────────────────────────────────────────────────

function ContactCard({
  contact, onEdit, onDelete,
}: {
  contact: CompanyContact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Avatar + name */}
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {contact.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{contact.name}</p>
              {contact.title && <p className="text-xs text-muted-foreground truncate">{contact.title}</p>}
            </div>
          </div>

          {/* Contact details */}
          <div className="ml-10 space-y-0.5">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 8.07 8.07l1.27-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                {contact.phone}
              </a>
            )}
            {contact.notes && (
              <p className="text-xs text-muted-foreground/70 italic mt-1">{contact.notes}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button type="button" onClick={onEdit}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button type="button"
            onClick={() => confirm(`Delete ${contact.name}?`) && onDelete()}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

export interface CompanyContactsDrawerProps {
  company: SalesCompany | null;
  onClose: () => void;
}

export function CompanyContactsDrawer({ company, onClose }: CompanyContactsDrawerProps) {
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CompanyContact | null>(null);

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    setAdding(false);
    setEditing(null);
    getCompanyContacts(company.id)
      .then(setContacts)
      .finally(() => setLoading(false));
  }, [company]);

  if (!company) return null;

  function handleSaved(c: CompanyContact) {
    setContacts((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next; }
      return [...prev, c];
    });
    setAdding(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    await deleteCompanyContact(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-card border-l shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Contacts</h2>
            <p className="text-xs text-muted-foreground">{company.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              {contacts.map((c) =>
                editing?.id === c.id ? (
                  <div key={c.id} className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs font-semibold mb-3 text-foreground">Edit Contact</p>
                    <ContactForm
                      companyId={company.id}
                      initial={c}
                      onSave={handleSaved}
                      onCancel={() => setEditing(null)}
                    />
                  </div>
                ) : (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    onEdit={() => { setAdding(false); setEditing(c); }}
                    onDelete={() => handleDelete(c.id)}
                  />
                )
              )}

              {contacts.length === 0 && !adding && (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <svg className="mx-auto mb-3 text-muted-foreground/30" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <p className="text-sm text-muted-foreground">No contacts yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add people from this company you work with.</p>
                </div>
              )}

              {/* Add form */}
              {adding && (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-semibold mb-3 text-foreground">New Contact</p>
                  <ContactForm
                    companyId={company.id}
                    onSave={handleSaved}
                    onCancel={() => setAdding(false)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!adding && !editing && (
          <div className="border-t p-4">
            <button
              type="button"
              onClick={() => { setEditing(null); setAdding(true); }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Contact
            </button>
          </div>
        )}
      </div>
    </>
  );
}
