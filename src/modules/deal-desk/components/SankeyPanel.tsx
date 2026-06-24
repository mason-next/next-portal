"use client";

import { useState } from "react";
import { generateSankeyText } from "@/modules/deal-desk/lib/sankey-generator";
import { calcFinancials, fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import { memberPayoutCents, memberRateBps } from "@/modules/deal-desk/lib/commission-engine";
import type { DealDeskQuote } from "@/types/deal-desk";
import { cn } from "@/lib/utils";

interface SankeyPanelProps {
  quote: DealDeskQuote;
}

interface FlowNode {
  label: string;
  cents: number;
  pct: number;
  color: string;
  depth: number;
  parentCents?: number;
}

export function SankeyPanel({ quote }: SankeyPanelProps) {
  const [copied, setCopied] = useState(false);
  const text = generateSankeyText(quote);
  const f = calcFinancials(quote.categories);
  const rev = f.revenueCents;

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quote.quoteNumber}-${quote.revision}-sankey.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Build waterfall visualization nodes
  const commTeam = quote.team.map((m) => ({
    label: `${m.name || m.role} (${fmtPct(memberRateBps(m, f.band) / 100, 2)})`,
    cents: memberPayoutCents(rev, m, f.band),
    pct: memberRateBps(m, f.band) / 100,
    color: "bg-violet-400",
    depth: 3,
    parentCents: f.commissionPoolCents,
  }));

  const nodes: FlowNode[] = [
    { label: "Revenue (100%)",           cents: rev,                          pct: 100,                                            color: "bg-blue-500",   depth: 0 },
    { label: "Job Cost / COGS",          cents: f.costCents,                  pct: (f.costCents / rev) * 100,                     color: "bg-orange-400", depth: 1, parentCents: rev },
    { label: "Gross Profit",             cents: f.grossProfitCents,           pct: f.grossMarginPct,                              color: "bg-emerald-500",depth: 1, parentCents: rev },
    { label: "Commission Pool",          cents: f.commissionPoolCents,        pct: f.band.totalBps / 100,                         color: "bg-violet-400", depth: 2, parentCents: f.grossProfitCents },
    { label: "Mason Share",             cents: f.masonShareCents,            pct: (f.masonShareCents / rev) * 100,               color: "bg-cyan-500",   depth: 2, parentCents: f.grossProfitCents },
    ...commTeam,
    { label: "Salaries & Overhead (12%)", cents: f.salariesOverheadCents,   pct: 12,                                            color: "bg-slate-400",  depth: 3, parentCents: f.masonShareCents },
    { label: "Mason Profit",             cents: f.masonProfitCents,          pct: (f.masonProfitCents / rev) * 100,              color: "bg-teal-500",   depth: 3, parentCents: f.masonShareCents },
    { label: "Leadership Bonus",         cents: f.leadershipBonusCents,      pct: (f.leadershipBonusCents / rev) * 100,          color: "bg-amber-400",  depth: 4, parentCents: f.masonProfitCents },
    { label: "Mason Retained Profit",    cents: f.masonRetainedProfitCents,  pct: (f.masonRetainedProfitCents / rev) * 100,      color: "bg-green-600",  depth: 4, parentCents: f.masonProfitCents },
  ];

  return (
    <div className="space-y-6">
      {/* Visual flow */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Revenue Flow</h3>
        <div className="space-y-2">
          {nodes.map((node, i) => {
            const barPct = node.parentCents
              ? Math.max(1, (node.cents / Math.max(node.parentCents, 1)) * 100)
              : 100;
            return (
              <div key={i} className="flex items-center gap-3" style={{ paddingLeft: `${node.depth * 24}px` }}>
                {node.depth > 0 && (
                  <div className="text-muted-foreground text-xs select-none">↳</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-xs text-muted-foreground truncate">{node.label}</span>
                    <div className="flex gap-3 tabular-nums text-xs shrink-0">
                      <span className="text-muted-foreground">{fmtPct(node.pct, 1)}</span>
                      <span className="font-medium">{fmtUSD(node.cents)}</span>
                    </div>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", node.color)} style={{ width: `${barPct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Text export */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">SankeyMATIC Export</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Paste directly into sankeymatic.com/build</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              Download .txt
            </button>
          </div>
        </div>
        <textarea
          readOnly
          value={text}
          rows={14}
          className="w-full rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}
