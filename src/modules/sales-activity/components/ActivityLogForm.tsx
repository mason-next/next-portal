"use client";

import { useState } from "react";
import type { SalesLogo, SalesActivity } from "@/types/sales";
import { ACTIVITY_TYPES, getWeekStart } from "@/types/sales";

interface ActivityLogFormProps {
  logos: SalesLogo[];
  currentUser: string;
  teamMembers?: string[];
  isManagement?: boolean;
  onSubmit: (activity: Omit<SalesActivity, "id" | "createdAt">) => void;
}

export function ActivityLogForm({ logos, currentUser, teamMembers = [], isManagement, onSubmit }: ActivityLogFormProps) {
  const [type, setType] = useState<SalesActivity["type"]>("Call");
  const [description, setDescription] = useState("");
  const [logoId, setLogoId] = useState("");
  const [durationMins, setDurationMins] = useState(0);
  const [userName, setUserName] = useState(currentUser);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      userId: null,
      userName: userName || currentUser,
      logoId: logoId || null,
      type,
      description,
      weekStart: getWeekStart(),
      durationMins,
    });
    setDescription("");
    setDurationMins(0);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold">Log Activity</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isManagement && teamMembers.length > 0 && (
          <label className="space-y-1 col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Team Member</span>
            <select
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Select —</option>
              {teamMembers.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        )}
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as SalesActivity["type"])}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Company</span>
          <select
            value={logoId}
            onChange={(e) => setLogoId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— General —</option>
            {logos.map((l) => <option key={l.id} value={l.id}>{l.company}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Duration (min)</span>
          <input
            type="number"
            min={0}
            value={durationMins}
            onChange={(e) => setDurationMins(parseInt(e.target.value) || 0)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="space-y-1 col-span-2 sm:col-span-4">
          <span className="text-xs font-medium text-muted-foreground">Notes (optional)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="What was discussed or accomplished?"
          />
        </label>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          Log Activity
        </button>
      </div>
    </form>
  );
}
