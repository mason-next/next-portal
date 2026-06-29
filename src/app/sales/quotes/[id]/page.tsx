"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuotePortal } from "@/modules/quote-portal/lib/useQuotePortal";
import type { QuoteAccessLog } from "@/types/sales";

// ── User-agent parser ─────────────────────────────────────────────────────────

function parseUA(ua: string): { browser: string; os: string } {
  if (!ua) return { browser: "Unknown", os: "Unknown" };

  let browser = "Unknown";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("MSIE") || ua.includes("Trident/")) browser = "IE";

  let os = "Unknown";
  if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/iPad/i.test(ua)) os = "iPad";
  else if (/Android.*Mobile/i.test(ua)) os = "Android";
  else if (/Android/i.test(ua)) os = "Android Tablet";
  else if (/Macintosh/i.test(ua)) os = "macOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";

  return { browser, os };
}

function BrowserIcon({ browser }: { browser: string }) {
  const color = browser === "Chrome" ? "#4285F4" : browser === "Safari" ? "#006CFF" : browser === "Firefox" ? "#FF6611" : browser === "Edge" ? "#0078D4" : "#888";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: color + "18", flexShrink: 0 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill={color}>
        <circle cx="12" cy="12" r="10" />
      </svg>
    </span>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
    >
      {copied ? (
        <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
      ) : (
        <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> {label}</>
      )}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { quotes, isLoading, getLogs, toggle } = useQuotePortal();
  const [logs, setLogs] = useState<QuoteAccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const quote = quotes.find((q) => q.id === id);

  useEffect(() => {
    if (!id) return;
    setLogsLoading(true);
    getLogs(id).then((data) => { setLogs(data); setLogsLoading(false); });
  }, [id, getLogs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-8 space-y-3">
        <p className="text-sm text-muted-foreground">Presentation not found.</p>
        <Link href="/sales/quotes" className="text-sm text-primary hover:underline">← Back to Quote Portal</Link>
      </div>
    );
  }

  const uniqueEmails = new Set(logs.map((l) => l.email)).size;
  const customerUrl = typeof window !== "undefined" ? `${window.location.origin}/q/${quote.slug}` : `/q/${quote.slug}`;

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-8">

      {/* Top nav row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground border hover:bg-muted hover:text-foreground transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back
        </button>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/sales" className="hover:text-foreground">Sales</Link>
          <span>/</span>
          <Link href="/sales/quotes" className="hover:text-foreground">Interactive Quotes</Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">{quote.title}</span>
        </div>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">

          {/* Left: title + meta */}
          <div className="space-y-3 min-w-0">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                quote.isActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${quote.isActive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                {quote.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{quote.title}</h1>
              <p className="text-muted-foreground mt-1">{quote.customer}</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <span className="font-mono text-xs">{customerUrl}</span>
            </div>
          </div>

          {/* Right: actions — all vertically centered, same height */}
          <div className="flex items-center gap-2 self-center flex-shrink-0">
            <CopyBtn value={customerUrl} label="Copy Link" />
            <a
              href={`/q/${quote.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" x2="21" y1="14" y2="3"/>
              </svg>
              Preview
            </a>
            <button
              onClick={async () => { setToggling(true); await toggle(quote.id); setToggling(false); }}
              disabled={toggling}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                quote.isActive
                  ? "border border-destructive/40 text-destructive hover:bg-destructive/10"
                  : "border border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              }`}
            >
              {toggling ? "…" : quote.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5 space-y-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Views</div>
          <div className="text-3xl font-bold tabular-nums">{logs.length}</div>
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unique Visitors</div>
          <div className="text-3xl font-bold tabular-nums">{uniqueEmails}</div>
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-1">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Accessed</div>
          <div className="text-sm font-semibold mt-1.5">
            {logs.length > 0 ? formatTime(logs[0].accessedAt) : <span className="text-muted-foreground font-normal">Never</span>}
          </div>
        </div>
      </div>

      {/* Access Log */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Access Log</h2>
          <span className="text-xs text-muted-foreground">{logs.length} {logs.length === 1 ? "entry" : "entries"}</span>
        </div>

        {logsLoading ? (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Loading logs…
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center space-y-2">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-sm font-medium">No views yet</p>
            <p className="text-sm text-muted-foreground">Share the customer link to start tracking access.</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date / Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Browser</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">OS / Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log, i) => {
                  const { browser, os } = parseUA(log.userAgent ?? "");
                  return (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {log.email[0].toUpperCase()}
                          </div>
                          <span className="font-medium">{log.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground tabular-nums text-xs">
                        {formatTime(log.accessedAt)}
                        {i === 0 && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">latest</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <BrowserIcon browser={browser} />
                          <span className="text-sm">{browser}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{os}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{log.ip || "—"}</td>
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
