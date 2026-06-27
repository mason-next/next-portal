"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useQuotePortal } from "@/modules/quote-portal/lib/useQuotePortal";
import type { QuoteAccessLog, QuotePresentation } from "@/types/sales";

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { quotes, isLoading, getLogs, toggle, remove } = useQuotePortal();
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/sales" className="hover:text-foreground">Sales</Link>
        <span>/</span>
        <Link href="/sales/quotes" className="hover:text-foreground">Quote Portal</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{quote.title}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{quote.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{quote.customer}</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/q/${quote.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors font-mono"
          >
            /q/{quote.slug} ↗
          </a>
          <button
            onClick={() => toggle(quote.id)}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            {quote.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

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
                  <th className="px-5 py-3 text-left text-xs text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground">Date / Time</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20">
                    <td className="px-5 py-3 font-medium">{log.email}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {new Date(log.accessedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.ip || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
