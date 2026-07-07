"use client";

import { useEffect, useState } from "react";
import { CheckSquare, Square, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { cn } from "@/lib/utils";
import type { WorkflowStep } from "@/types/workflow";
import { STEP_TASK_TEMPLATES, type TaskTemplate } from "@/lib/data/task-template-config";

interface SeedTemplatesModalProps {
  projectId: string;
  step: WorkflowStep;
  onClose: () => void;
  onDone: () => void;
}

interface TaskSelection {
  template: TaskTemplate;
  selected: boolean;
  subtasks: boolean[];
}

export function SeedTemplatesModal({ projectId, step, onClose, onDone }: SeedTemplatesModalProps) {
  const templates = STEP_TASK_TEMPLATES[step.key] ?? [];
  const [selections, setSelections] = useState<TaskSelection[]>(() =>
    templates.map((t) => ({
      template: t,
      selected: true,
      subtasks: (t.subtasks ?? []).map(() => true),
    }))
  );
  const [hasExisting, setHasExisting] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(
    () => new Set(templates.map((_, i) => i))
  );

  useEffect(() => {
    fetch(
      `/api/implementation/seed-step-tasks?projectId=${encodeURIComponent(projectId)}&workflowStepId=${encodeURIComponent(step.id)}`
    )
      .then((r) => r.json())
      .then((d) => setHasExisting(Boolean(d.exists)))
      .catch(() => setHasExisting(false));
  }, [projectId, step.id]);

  function toggleTask(idx: number) {
    setSelections((prev) => {
      const next = [...prev];
      const newSelected = !next[idx].selected;
      next[idx] = {
        ...next[idx],
        selected: newSelected,
        subtasks: next[idx].subtasks.map(() => newSelected),
      };
      return next;
    });
  }

  function toggleSubtask(taskIdx: number, subIdx: number) {
    setSelections((prev) => {
      const next = [...prev];
      const newSubs = [...next[taskIdx].subtasks];
      newSubs[subIdx] = !newSubs[subIdx];
      next[taskIdx] = {
        ...next[taskIdx],
        subtasks: newSubs,
        selected: newSubs.some(Boolean),
      };
      return next;
    });
  }

  function toggleExpand(idx: number) {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function selectAll(on: boolean) {
    setSelections((prev) =>
      prev.map((s) => ({ ...s, selected: on, subtasks: s.subtasks.map(() => on) }))
    );
  }

  async function handleApply() {
    const selectedTasks = selections
      .filter((s) => s.selected)
      .map((s) => ({
        title: s.template.title,
        description: s.template.description ?? "",
        subtasks: (s.template.subtasks ?? []).filter((_, i) => s.subtasks[i]),
      }));

    if (selectedTasks.length === 0) {
      onClose();
      return;
    }

    setLoading(true);
    setApplyError(null);
    try {
      const res = await fetch("/api/implementation/seed-step-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          workflowStepId: step.id,
          stepKey: step.key,
          selectedTasks,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setApplyError((body as { error?: string })?.error ?? `Server error (${res.status})`);
        return;
      }
      onDone();
    } catch {
      setApplyError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = selections.filter((s) => s.selected).length;
  const allSelected = selectedCount === templates.length;

  return (
    <Modal open onClose={onClose}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Load Templates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select tasks and subtasks to load for <strong>{step.name}</strong>.
        </p>
      </div>

      {hasExisting && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            This step already has tasks. Duplicate titles will be skipped automatically.
          </span>
        </div>
      )}

      {/* Select all / deselect all */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {selectedCount} of {templates.length} tasks selected
        </span>
        <button
          type="button"
          onClick={() => selectAll(!allSelected)}
          className="text-xs text-primary hover:underline underline-offset-2"
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>

      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-0.5">
        {templates.map((template, taskIdx) => {
          const sel = selections[taskIdx];
          const isExpanded = expandedTasks.has(taskIdx);
          const hasSubtasks = (template.subtasks ?? []).length > 0;

          return (
            <div
              key={taskIdx}
              className={cn(
                "rounded-lg border transition-colors",
                sel.selected ? "border-border" : "border-border/40 bg-muted/20"
              )}
            >
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleTask(taskIdx)}
                  className={cn(
                    "flex-none transition-colors",
                    sel.selected ? "text-primary" : "text-muted-foreground/50"
                  )}
                >
                  {sel.selected ? (
                    <CheckSquare className="size-4" />
                  ) : (
                    <Square className="size-4" />
                  )}
                </button>
                <span
                  className={cn(
                    "flex-1 text-sm font-medium",
                    !sel.selected && "text-muted-foreground line-through"
                  )}
                >
                  {template.title}
                </span>
                {hasSubtasks && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(taskIdx)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                )}
              </div>

              {isExpanded && hasSubtasks && (
                <div className="border-t bg-muted/10 px-3 py-2 space-y-1.5">
                  {(template.subtasks ?? []).map((subtaskTitle, subIdx) => (
                    <div key={subIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSubtask(taskIdx, subIdx)}
                        className={cn(
                          "flex-none transition-colors",
                          sel.subtasks[subIdx] ? "text-primary" : "text-muted-foreground/40"
                        )}
                      >
                        {sel.subtasks[subIdx] ? (
                          <CheckSquare className="size-3.5" />
                        ) : (
                          <Square className="size-3.5" />
                        )}
                      </button>
                      <span
                        className={cn(
                          "text-sm",
                          !sel.subtasks[subIdx] && "text-muted-foreground line-through"
                        )}
                      >
                        {subtaskTitle}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {applyError && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{applyError}</p>
      )}
      <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleApply} disabled={loading || selectedCount === 0}>
          {loading ? "Loading…" : `Load ${selectedCount} Task${selectedCount !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </Modal>
  );
}
