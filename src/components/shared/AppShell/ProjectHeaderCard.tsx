import type { ReactNode } from "react";

interface ProjectHeaderCardProps {
  name: string;
  projectNumber: string;
  customerName: string;
  siteAddress: string;
  stateBadge?: ReactNode;
  healthBadge?: ReactNode;
  actions?: ReactNode;
}

export function ProjectHeaderCard({
  name,
  projectNumber,
  customerName,
  siteAddress,
  stateBadge,
  healthBadge,
  actions,
}: ProjectHeaderCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-sm">
      <div className="grid grid-cols-6 gap-6">
        <Field label="Project" value={name} />
        <Field label="Project #" value={projectNumber} />
        <Field label="Customer" value={customerName} />
        <Field label="Site Address" value={siteAddress || "—"} />
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Status</div>
          {stateBadge}
        </div>
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Health</div>
          {healthBadge}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
