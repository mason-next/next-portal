"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ROLE_TYPES, ROLE_TYPE_LABELS } from "@/types/user";
import type { AppUser } from "@/types/user";
import type { AssigneeTarget } from "@/lib/data/system-defaults";

const INTERNAL_ROLE_TYPES = ROLE_TYPES.filter(
  (r) => r !== "Customer" && r !== "Subcontractor" && r !== "Administrator"
);

interface AssigneeTargetSelectorProps {
  value: AssigneeTarget | null;
  onChange: (value: AssigneeTarget | null) => void;
  users: AppUser[];
  placeholder?: string;
  className?: string;
}

export function AssigneeTargetSelector({
  value,
  onChange,
  users,
  placeholder = "Not set",
  className,
}: AssigneeTargetSelectorProps) {
  const [kind, setKind] = useState<"user" | "roleType">(value?.kind ?? "user");
  const activeUsers = users.filter((u) => u.isActive);

  function handleKindChange(newKind: "user" | "roleType") {
    setKind(newKind);
    onChange(null);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex shrink-0 overflow-hidden rounded-md border text-xs">
        <button
          type="button"
          onClick={() => handleKindChange("user")}
          className={cn(
            "px-2.5 py-1 transition-colors",
            kind === "user"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          User
        </button>
        <button
          type="button"
          onClick={() => handleKindChange("roleType")}
          className={cn(
            "border-l px-2.5 py-1 transition-colors",
            kind === "roleType"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Role Type
        </button>
      </div>

      {kind === "user" ? (
        <select
          value={value?.kind === "user" ? value.value : ""}
          onChange={(e) => {
            const id = e.target.value;
            onChange(id ? { kind: "user", value: id } : null);
          }}
          className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-primary"
        >
          <option value="">{placeholder}</option>
          {activeUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      ) : (
        <select
          value={value?.kind === "roleType" ? value.value : ""}
          onChange={(e) => {
            const rt = e.target.value;
            onChange(rt ? { kind: "roleType", value: rt } : null);
          }}
          className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-primary"
        >
          <option value="">{placeholder}</option>
          {INTERNAL_ROLE_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {ROLE_TYPE_LABELS[rt]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
