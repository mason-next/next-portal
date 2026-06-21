import type { ReactNode } from "react";

interface ProjectHeaderCardProps {
  name: string;
  projectNumber: string;
  customerName: string;
  stateBadge?: ReactNode;
  actions?: ReactNode;
}

export function ProjectHeaderCard({
  name,
  projectNumber,
  customerName,
  stateBadge,
  actions,
}: ProjectHeaderCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-sm">
      <div className="grid grid-cols-4 gap-8">
        <Field label="Project" value={name} />
        <Field label="Project #" value={projectNumber} />
        <Field label="Customer" value={customerName} />
        <div>
          <div className="mb-1 text-xs text-muted-foreground">State</div>
          {stateBadge}
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
