"use client";

import { useState } from "react";
import { generateSankeyText } from "@/modules/deal-desk/lib/sankey-generator";
import { calcFinancials } from "@/modules/deal-desk/lib/financial-calc";
import { DealSankey } from "@/modules/deal-desk/components/DealSankey";
import type { DealDeskQuote } from "@/types/deal-desk";

interface SankeyPanelProps {
  quote: DealDeskQuote;
}

export function SankeyPanel({ quote }: SankeyPanelProps) {
  const [copied, setCopied] = useState(false);
  const text = generateSankeyText(quote);
  const f = calcFinancials(quote.categories, quote.projectType);

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

  return (
    <div className="space-y-6">
      {/* Same Sankey diagram as Deal Report */}
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Profit Distribution</h3>
        <DealSankey f={f} team={quote.team.length > 0 ? quote.team : undefined} />
      </div>

      {/* SankeyMATIC text export */}
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
