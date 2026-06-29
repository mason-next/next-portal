"use client";

import Image from "next/image";
import { useState } from "react";
import type { SalesLogo } from "@/types/sales";
import { LOGO_STAGES } from "@/types/sales";
import { cn } from "@/lib/utils";

const STAGE_COLORS: Record<string, string> = {
  Prospecting: "bg-slate-100 text-slate-700",
  Qualifying: "bg-blue-100 text-blue-700",
  Proposal: "bg-violet-100 text-violet-700",
  Negotiation: "bg-amber-100 text-amber-700",
  "Closed Won": "bg-emerald-100 text-emerald-700",
  "Closed Lost": "bg-red-100 text-red-700",
};

interface LogoCardProps {
  logo: SalesLogo;
  onEdit: (logo: SalesLogo) => void;
  onDelete: (id: string) => void;
  onStageChange: (id: string, stage: string) => void;
}

export function LogoCard({ logo, onEdit, onDelete, onStageChange }: LogoCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted/50 border flex items-center justify-center overflow-hidden shrink-0">
            {logo.domain && !imgError ? (
              <Image
                src={`https://logo.clearbit.com/${logo.domain}`}
                alt={logo.company}
                width={40}
                height={40}
                className="object-contain"
                onError={() => setImgError(true)}
                unoptimized
              />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">
                {logo.company.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">{logo.company}</div>
            {logo.ownerName && (
              <div className="text-xs text-muted-foreground">{logo.ownerName}</div>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(logo)}
            className="text-xs text-muted-foreground hover:text-foreground px-1"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => confirm(`Remove ${logo.company}?`) && onDelete(logo.id)}
            className="text-xs text-muted-foreground hover:text-destructive px-1"
          >
            ✕
          </button>
        </div>
      </div>

      <select
        value={logo.stage}
        onChange={(e) => onStageChange(logo.id, e.target.value)}
        className={cn(
          "w-full rounded-full px-3 py-1 text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring",
          STAGE_COLORS[logo.stage] ?? "bg-muted text-muted-foreground"
        )}
      >
        {LOGO_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {logo.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2">{logo.notes}</p>
      )}
    </div>
  );
}
