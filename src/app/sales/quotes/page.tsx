"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuotePortal } from "@/modules/quote-portal/lib/useQuotePortal";
import { UploadButton } from "@/modules/quote-portal/components/UploadButton";
import { CURRENT_USER } from "@/lib/current-user";

export default function QuotePortalAdminPage() {
  const { quotes, isLoading, create, toggle, remove, bump } = useQuotePortal();
  const [showForm, setShowForm] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim() || !title.trim() || !customer.trim()) return;
    setSubmitting(true);
    try {
      await create({ slug: slug.trim().toLowerCase().replace(/\s+/g, "-"), title: title.trim(), customer: customer.trim(), createdBy: CURRENT_USER });
      setSlug(""); setTitle(""); setCustomer("");
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/sales" className="hover:text-foreground">Sales</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Quote Portal</span>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Quote Portal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage customer-facing quote presentations</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + New Presentation
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-xl p-6">
            <h2 className="text-base font-semibold mb-4">New Presentation</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Customer Name *</span>
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} required className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Acme Corporation" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Presentation Title *</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Network Infrastructure Proposal" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">URL Slug * (used in shareable link)</span>
                <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="acme-network-proposal" />
                {slug && <p className="text-xs text-muted-foreground">/q/{slug.toLowerCase().replace(/\s+/g,"-")}</p>}
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {submitting ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      ) : quotes.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No presentations yet. Create one to get a shareable customer link.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-5 py-3 text-left text-xs text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">Shareable Link</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">Views</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">Last Access</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-muted/20">
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/sales/quotes/${q.id}`} className="hover:underline text-primary">{q.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{q.customer}</td>
                  <td className="px-4 py-3">
                    <a href={`/q/${q.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-mono">/q/{q.slug}</a>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{q.totalViews ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {q.lastAccessed ? new Date(q.lastAccessed).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${q.isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {q.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <UploadButton quoteId={q.id} hasFile={!!q.storageKey} onUploaded={bump} />
                      <button onClick={() => toggle(q.id)} className="text-xs text-muted-foreground hover:text-foreground">
                        {q.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => confirm(`Delete "${q.title}"? This will break the customer link.`) && remove(q.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
