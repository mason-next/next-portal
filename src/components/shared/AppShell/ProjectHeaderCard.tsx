import type { ReactNode } from "react";
import { AddressLink } from "@/components/shared/AddressLink";

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
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:gap-6 min-w-0 flex-1">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Project" value={name} />
          <Field label="Project #" value={projectNumber} />
          <Field label="Customer" value={customerName} />
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Site Address</div>
            <div className="truncate text-sm font-semibold">
              <AddressLink address={siteAddress} />
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Status</div>
            {stateBadge}
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Health</div>
            {healthBadge}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
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
