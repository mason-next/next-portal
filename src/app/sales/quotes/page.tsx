"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuotePortal } from "@/modules/quote-portal/lib/useQuotePortal";
import { UploadButton } from "@/modules/quote-portal/components/UploadButton";
import { CURRENT_USER } from "@/lib/current-user";
import type { QuotePresentation } from "@/types/sales";

// ── Email template ────────────────────────────────────────────────────────────

function makeEmailLink(q: QuotePresentation, origin: string) {
  const url = `${origin}/q/${q.slug}`;
  const subject = encodeURIComponent(`Your AV System Proposal — ${q.customer}`);
  const body = encodeURIComponent(
    `Hi,\n\nThank you for the opportunity to present a proposal for your project.\n\n` +
    `I've prepared a custom interactive presentation for you:\n\n${url}\n\n` +
    `The proposal walks through the complete system design, equipment specifications, ` +
    `and pricing. You can also download the full PDF from within the presentation.\n\n` +
    `Please don't hesitate to reach out with any questions — I'm happy to set up a call ` +
    `to review everything together.\n\nBest regards,\nMason Technologies`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

// ── 3-dots dropdown ───────────────────────────────────────────────────────────

function DotsMenu({ q, toggle, remove }: {
  q: QuotePresentation;
  toggle: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        title="More options"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border bg-card shadow-lg py-1">
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
            onClick={async () => { setOpen(false); await toggle(q.id); }}
          >
            {q.isActive ? "Disable" : "Enable"}
          </button>
          <div className="my-1 border-t" />
          <button
            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            onClick={async () => {
              setOpen(false);
              if (confirm(`Delete "${q.title}"?\n\nThis will permanently break the customer link and cannot be undone.`)) {
                await remove(q.id);
              }
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Copy Link button ──────────────────────────────────────────────────────────

function CopyLinkBtn({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      title="Copy shareable link"
      onClick={() => {
        navigator.clipboard.writeText(`${window.location.origin}/q/${slug}`).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="text-xs px-2 py-1 rounded-md border transition-colors hover:bg-muted/60"
    >
      {copied ? "✓ Copied!" : "🔗 Copy"}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InteractiveQuotePortalPage() {
  const { quotes, isLoading, create, toggle, remove, bump } = useQuotePortal();

  // Stats
  const totalViews = quotes.reduce((a, q) => a + (q.totalViews ?? 0), 0);
  const activeCount = quotes.filter((q) => q.isActive).length;

  // 30s auto-refresh
  useEffect(() => {
    const id = setInterval(() => bump(), 30_000);
    return () => clearInterval(id);
  }, [bump]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [customer, setCustomer] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const zipRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  function autoSlug(val: string) {
    return val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (!slug.trim() || !title.trim() || !customer.trim()) return;
    setSubmitting(true);
    try {
      const created = await create({
        slug: autoSlug(slug),
        title: title.trim(),
        customer: customer.trim(),
        createdBy: CURRENT_USER,
      });

      if ((zipFile || pdfFile) && created?.id) {
        const form = new FormData();
        if (zipFile) form.append("zip_file", zipFile);
        if (pdfFile) form.append("pdf_file", pdfFile);
        const res = await fetch(`/api/quotes/${created.id}/upload`, { method: "POST", body: form });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setSubmitError(`Created, but file upload failed: ${(body as { error?: string }).error ?? "unknown"}`);
        }
      }

      bump();
      setSlug(""); setTitle(""); setCustomer(""); setZipFile(null); setPdfFile(null);
      setShowForm(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSlug(""); setTitle(""); setCustomer(""); setZipFile(null); setPdfFile(null);
    setSubmitError(""); setShowForm(false);
  }

  return (
    <div className="mx-auto max-w-6xl p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/sales" className="hover:text-foreground">Sales</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Interactive Quote Portal</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Interactive Quote Portal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Share customer-facing HTML presentations with an email gate and optional PDF download
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + New Presentation
        </button>
      </div>

      {/* Stats cards */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <div className="text-xs text-muted-foreground mb-1">Total Quotes</div>
            <div className="text-2xl font-bold">{quotes.length}</div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="text-xs text-muted-foreground mb-1">Active</div>
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="text-xs text-muted-foreground mb-1">Total Views</div>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card shadow-xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold">New Interactive Quote</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Fill in the details and optionally attach files now — you can always upload later.</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1 col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Customer Name *</span>
                  <input
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    required
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="City of Coral Gables"
                  />
                </label>
                <label className="block space-y-1 col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Presentation Title *</span>
                  <input
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); if (!slug) setSlug(autoSlug(e.target.value)); }}
                    required
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Network Infrastructure Proposal"
                  />
                </label>
                <label className="block space-y-1 col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">URL Slug *</span>
                  <div className="flex items-center">
                    <span className="rounded-l-md border border-r-0 bg-muted px-3 py-2 text-sm text-muted-foreground">/q/</span>
                    <input
                      value={slug}
                      onChange={(e) => setSlug(autoSlug(e.target.value))}
                      required
                      className="flex-1 rounded-r-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="coral-gables-network"
                    />
                  </div>
                </label>
              </div>

              <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attachments (optional)</p>
                <div
                  className="flex items-center justify-between rounded-md border bg-background px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => zipRef.current?.click()}
                >
                  <div>
                    <div className="text-sm font-medium">HTML Presentation (ZIP)</div>
                    <div className="text-xs text-muted-foreground">ZIP file containing the interactive HTML presentation</div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {zipFile
                      ? <span className="text-xs text-emerald-600 font-medium">✓ {zipFile.name}</span>
                      : <span className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">Choose ZIP</span>}
                  </div>
                </div>
                <input ref={zipRef} type="file" accept=".zip" className="hidden"
                  onChange={(e) => { setZipFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />

                <div
                  className="flex items-center justify-between rounded-md border bg-background px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => pdfRef.current?.click()}
                >
                  <div>
                    <div className="text-sm font-medium">Downloadable PDF</div>
                    <div className="text-xs text-muted-foreground">Shown as a download button inside the presentation</div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {pdfFile
                      ? <span className="text-xs text-emerald-600 font-medium">✓ {pdfFile.name}</span>
                      : <span className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">Choose PDF</span>}
                  </div>
                </div>
                <input ref={pdfRef} type="file" accept=".pdf" className="hidden"
                  onChange={(e) => { setPdfFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              </div>

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={resetForm} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {submitting ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      ) : quotes.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-card p-16 text-center space-y-3">
          <div className="text-4xl">🔗</div>
          <p className="text-base font-medium">No interactive quotes yet</p>
          <p className="text-sm text-muted-foreground">Create a presentation to get a shareable link you can send to customers.</p>
          <button onClick={() => setShowForm(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors mt-2">
            + New Presentation
          </button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Presentation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Files</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Views</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Last Access</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-muted/20">
                  <td className="px-5 py-4 font-medium">
                    <Link href={`/sales/quotes/${q.id}`} className="hover:underline text-primary">{q.title}</Link>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">/q/{q.slug}</div>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground text-sm">{q.customer}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <CopyLinkBtn slug={q.slug} />
                      <a
                        href={makeEmailLink(q, typeof window !== "undefined" ? window.location.origin : "")}
                        title="Send email to customer"
                        className="text-xs px-2 py-1 rounded-md border transition-colors hover:bg-muted/60"
                      >
                        ✉ Email
                      </a>
                      <Link
                        href={`/sales/quotes/${q.id}`}
                        title="View access logs"
                        className="text-xs px-2 py-1 rounded-md border transition-colors hover:bg-muted/60"
                      >
                        📊 Logs
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <UploadButton quoteId={q.id} hasFile={!!q.storageKey} onUploaded={bump} />
                  </td>
                  <td className="px-4 py-4 tabular-nums text-center text-muted-foreground">{q.totalViews ?? 0}</td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    {q.lastAccessed ? new Date(q.lastAccessed).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${q.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                      {q.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <DotsMenu q={q} toggle={toggle} remove={remove} />
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
