"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalesTask, SalesOpportunity, TaskPriority } from "@/types/sales";
import { TASK_PRIORITIES } from "@/types/sales";
import { todayInput, toDateInput } from "@/modules/crm/lib/format";
import { DueChip, PriorityDot, TextInput, Select, OwnerSelect, PrimaryButton, SecondaryButton, Empty } from "./ui";

export interface TaskInput {
  id?: string;
  companyId: string | null;
  opportunityId: string | null;
  title: string;
  dueDate: string | null;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName: string;
}

export function TaskForm({
  companyId, opportunities, currentUser, initial, onSave, onCancel,
}: {
  companyId: string | null;
  opportunities?: Pick<SalesOpportunity, "id" | "name">[];
  currentUser: string;
  initial?: SalesTask;
  onSave: (t: TaskInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [dueDate, setDueDate] = useState(initial ? toDateInput(initial.dueDate) : todayInput());
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? "Normal");
  const [assigneeName, setAssigneeName] = useState(initial?.assigneeName ?? currentUser);
  const [assigneeId, setAssigneeId] = useState<string | null>(initial?.assigneeId ?? null);
  const [opportunityId, setOpportunityId] = useState(initial?.opportunityId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...(initial?.id ? { id: initial.id } : {}),
        companyId,
        opportunityId: opportunityId || null,
        title,
        dueDate: dueDate || null,
        priority,
        assigneeId,
        assigneeName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 p-3">
      <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task (e.g. Send pricing to CFO)" autoFocus required aria-label="Task title" />
      <div className="grid grid-cols-2 gap-2">
        <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Due date" />
        <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} aria-label="Priority">
          {TASK_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </Select>
        <OwnerSelect value={assigneeName} allowEmpty={false} onChange={(n, id) => { setAssigneeName(n); setAssigneeId(id); }} />
        {opportunities && (
          <Select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} aria-label="Opportunity">
            <option value="">Company-level</option>
            {opportunities.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving…" : initial ? "Save" : "Add task"}</PrimaryButton>
      </div>
    </form>
  );
}

export function TaskList({
  tasks, showCompany, canEdit, onToggle, onDelete, emptyText = "No open tasks.", highlightId,
}: {
  tasks: SalesTask[];
  showCompany?: boolean;
  canEdit: boolean;
  onToggle: (id: string, done: boolean) => Promise<unknown>;
  onDelete?: (id: string) => Promise<unknown>;
  emptyText?: string;
  /** Task to call out (e.g. the one clicked on the agenda). */
  highlightId?: string | null;
}) {
  if (tasks.length === 0) return <Empty>{emptyText}</Empty>;
  return (
    <ul className="divide-y">
      {tasks.map((t) => {
        const done = t.status === "Done";
        return (
          <li
            key={t.id}
            data-focus={`task-${t.id}`}
            className={cn(
              "group flex items-start gap-3 px-4 py-2.5 sm:gap-2.5 sm:py-2",
              highlightId === t.id && "bg-amber-50 ring-2 ring-inset ring-amber-400 dark:bg-amber-950/30",
            )}
          >
            <input
              type="checkbox"
              checked={done}
              disabled={!canEdit}
              onChange={(e) => onToggle(t.id, e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer sm:mt-1 sm:h-4 sm:w-4"
              aria-label={`Mark "${t.title}" ${done ? "open" : "done"}`}
            />
            <div className="min-w-0 flex-1">
              <div className={cn("flex items-center gap-1.5 text-sm", done && "text-muted-foreground line-through")}>
                <PriorityDot priority={t.priority} />
                <span className="line-clamp-2 sm:truncate">{t.title}</span>
                {t.autoGenerated && <span title="Created by workflow automation"><Zap className="h-3 w-3 shrink-0 text-amber-500" /></span>}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                {!done && <DueChip iso={t.dueDate} />}
                <span>{t.assigneeName || "Unassigned"}</span>
                {showCompany && t.company && (
                  <Link href={`/sales/accounts/${t.company.id}`} className="hover:text-foreground hover:underline">{t.company.name}</Link>
                )}
                {t.opportunity && <span className="truncate">· {t.opportunity.name}</span>}
              </div>
            </div>
            {canEdit && onDelete && (
              <button type="button" title="Delete task" onClick={() => confirm("Delete this task?") && onDelete(t.id)}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive sm:p-1 sm:opacity-0 sm:group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
