"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuotePortal } from "@/modules/quote-portal/lib/useQuotePortal";
import type { QuoteAccessLog } from "@/types/sales";

// ── User-agent parser ─────────────────────────────────────────────────────────

function parseUA(ua: string): { browser: string; device: string } {
  if (!ua) return { browser: "—", device: "—" };

  let browser = "Unknown";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("MSIE") || ua.includes("Trident/")) browser = "IE";

  let device = "Desktop";
  if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/iPad/i.test(ua)) device = "iPad";
  else if (/Android.*Mobile/i.test(ua)) device = "Android Phone";
  else if (/Android/i.test(ua)) device = "Android Tablet";
  else if (/Macintosh/i.test(ua)) device = "Mac";
  else if (/Windows/i.test(ua)) device = "Windows PC";
  else if (/Linux/i.test(ua)) device = "Linux";

  return { browser, device };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { quotes, isLoading, getLogs, toggle } = useQuotePortal();
  const [logs, setLogs] = useState<QuoteAccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const quote = quotes.find((q) => q.id === id);

  useEffect(() => {
    if (!id) return;
    setLogsLoading(true);
    getLogs(id).then((data) => { setLogs(data); setLogsLoading(false); });
  }, [id, getLogs]);

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!quote) return (
    <div className="p-8">
      <p className="text-sm text-muted-foreground">Presentation not found.</p>
      <Link href="/sales/quotes" className="text-sm text-primary hover:underline mt-2 inline-block">← Back to Quote Portal</Link>
    </div>
  );

  const uniqueEmails = new Set(logs.map((l) => l.email)).size;

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Back to Quote Portal
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/sales" className="hover:text-foreground">Sales</Link>
        <span>/</span>
        <Link href="/sales/quotes" className="hover:text-foreground">Quote Portal</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{quote.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{quote.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{quote.customer}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Customer link — clearly labeled */}
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Customer Link</span>
            <a
              href={`/q/${quote.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium font-mono hover:bg-muted transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" x2="21" y1="14" y2="3"/>
              </svg>
              /q/{quote.slug}
            </a>
          </div>
          <button
            onClick={() => toggle(quote.id)}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            {quote.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-muted/40 p-4">
          <div className="text-xs text-muted-foreground">Total Views</div>
          <div className="text-2xl font-bold mt-1">{logs.length}</div>
        </div>
        <div className="rounded-lg bg-muted/40 p-4">
          <div className="text-xs text-muted-foreground">Unique Visitors</div>
          <div className="text-2xl font-bold mt-1">{uniqueEmails}</div>
        </div>
        <div className="rounded-lg bg-muted/40 p-4">
          <div className="text-xs text-muted-foreground">Status</div>
          <div className={`text-lg font-bold mt-1 ${quote.isActive ? "text-emerald-600" : "text-muted-foreground"}`}>
            {quote.isActive ? "Active" : "Inactive"}
          </div>
        </div>
      </div>

      {/* Access Log */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Access Log</h2>
        {logsLoading ? (
          <p className="text-sm text-muted-foreground">Loading logs…</p>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No views yet. Share the link with the customer to get started.</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date / Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Browser</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => {
                  const { browser, device } = parseUA(log.userAgent ?? "");
                  return (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="px-5 py-3 font-medium">{log.email}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {new Date(log.accessedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{browser}</td>
                      <td className="px-4 py-3 text-muted-foreground">{device}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.ip || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
