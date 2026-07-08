"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { getMeetingDefaults, setMeetingDefaults } from "@/lib/data/system-defaults";
import { ROLE_TYPE_LABELS } from "@/types/user";
import { AssigneeTargetSelector } from "@/modules/admin/components/AssigneeTargetSelector";
import type { AppUser } from "@/types/user";
import type { AssigneeTarget, MeetingDefaults, MeetingType } from "@/lib/data/system-defaults";

const MEETING_LABELS: Record<MeetingType, string> = {
  "internal-kickoff": "Internal Kickoff",
  "technical-kickoff": "Technical Kickoff",
};

const MEETING_DESCRIPTIONS: Record<MeetingType, string> = {
  "internal-kickoff": "Added to every Internal Kickoff invite alongside the project team.",
  "technical-kickoff": "Added to every Technical Kickoff invite alongside the project team.",
};

const MEETING_TYPES: MeetingType[] = ["internal-kickoff", "technical-kickoff"];

export function MeetingDefaultsCard() {
  const { users } = useUsersContext();
  const [data, setData] = useState<Record<MeetingType, MeetingDefaults> | null>(null);
  const [saving, setSaving] = useState<MeetingType | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getMeetingDefaults("internal-kickoff"),
      getMeetingDefaults("technical-kickoff"),
    ]).then(([ik, tk]) => {
      if (active) setData({ "internal-kickoff": ik, "technical-kickoff": tk });
    });
    return () => {
      active = false;
    };
  }, []);

  function save(type: MeetingType, updated: MeetingDefaults) {
    setSaving(type);
    setMeetingDefaults(type, updated).finally(() => setSaving(null));
  }

  function addAttendee(type: MeetingType, target: AssigneeTarget) {
    if (!data) return;
    const next: MeetingDefaults = {
      ...data[type],
      standingAttendees: [...data[type].standingAttendees, target],
    };
    setData({ ...data, [type]: next });
    save(type, next);
  }

  function removeAttendee(type: MeetingType, index: number) {
    if (!data) return;
    const next: MeetingDefaults = {
      ...data[type],
      standingAttendees: data[type].standingAttendees.filter((_, i) => i !== index),
    };
    setData({ ...data, [type]: next });
    save(type, next);
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-1 text-sm font-semibold">Meeting Default Attendees</div>
      <p className="mb-5 text-sm text-muted-foreground">
        Standing attendees included on kickoff meeting invites in addition to the project&apos;s
        assigned team.
      </p>
      {data === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          {MEETING_TYPES.map((type) => (
            <MeetingSection
              key={type}
              label={MEETING_LABELS[type]}
              description={MEETING_DESCRIPTIONS[type]}
              defaults={data[type]}
              isSaving={saving === type}
              users={users}
              onAdd={(target) => addAttendee(type, target)}
              onRemove={(index) => removeAttendee(type, index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatTarget(target: AssigneeTarget, users: AppUser[]): string {
  if (target.kind === "user") {
    return users.find((u) => u.id === target.value)?.name ?? target.value;
  }
  const label = ROLE_TYPE_LABELS[target.value as keyof typeof ROLE_TYPE_LABELS];
  return label ? `${label} (role type)` : target.value;
}

function MeetingSection({
  label,
  description,
  defaults,
  isSaving,
  users,
  onAdd,
  onRemove,
}: {
  label: string;
  description: string;
  defaults: MeetingDefaults;
  isSaving: boolean;
  users: AppUser[];
  onAdd: (target: AssigneeTarget) => void;
  onRemove: (index: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTarget, setNewTarget] = useState<AssigneeTarget | null>(null);

  function commitAdd() {
    if (newTarget) onAdd(newTarget);
    setAdding(false);
    setNewTarget(null);
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-medium">{label}</div>
        {isSaving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{description}</p>
      {defaults.standingAttendees.length === 0 ? (
        <p className="mb-2 text-xs text-muted-foreground italic">No standing attendees.</p>
      ) : (
        <ul className="mb-2 space-y-1">
          {defaults.standingAttendees.map((t, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-1.5 text-sm"
            >
              <span>{formatTarget(t, users)}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className="flex items-center gap-2">
          <AssigneeTargetSelector
            value={newTarget}
            onChange={setNewTarget}
            users={users}
            placeholder="Select attendee…"
            className="flex-1"
          />
          <button
            type="button"
            onClick={commitAdd}
            disabled={!newTarget}
            className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setNewTarget(null);
            }}
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3" />
          Add attendee
        </button>
      )}
    </div>
  );
}
