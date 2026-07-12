"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, CheckSquare, Square, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importGanttItems, getGanttEntries } from "@/lib/data/gantt";
import { cn } from "@/lib/utils";
import type { GanttEntryFull } from "@/types/gantt";
import type { WorkflowStep } from "@/types/workflow";
import type { ImplementationTask } from "@/types/implementation";

const SECTION_ORDER = [
  "setup",
  "engineering",
  "procurement",
  "implementation",
  "closeout",
  "serviceWarranty",
] as const;

const SECTION_LABELS: Record<string, string> = {
  setup: "Setup",
  engineering: "Engineering",
  procurement: "Procurement",
  implementation: "Implementation",
  closeout: "Closeout",
  serviceWarranty: "Service & Warranty",
};

interface ImportWorkflowModalProps {
  projectId: string;
  allSteps: WorkflowStep[];
  allTasks: ImplementationTask[];
  existingStepIds: Set<string>;
  existingTaskIds: Set<string>;
  onDone: (newEntries: GanttEntryFull[]) => void;
  onClose: () => void;
}

export function ImportWorkflowModal({
  projectId,
  allSteps,
  allTasks,
  existingStepIds,
  existingTaskIds,
  onDone,
  onClose,
}: ImportWorkflowModalProps) {
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set());
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(SECTION_ORDER));
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  // Only show non-excluded steps
  const activeSteps = useMemo(
    () => allSteps.filter((s) => !s.isExcluded),
    [allSteps]
  );

  // Group steps by section
  const stepsBySection = useMemo(() => {
    const map = new Map<string, WorkflowStep[]>();
    activeSteps.forEach((s) => {
      if (!map.has(s.section)) map.set(s.section, []);
      map.get(s.section)!.push(s);
    });
    return map;
  }, [activeSteps]);

  // Tasks by workflowStepId
  const tasksByStep = useMemo(() => {
    const map = new Map<string, ImplementationTask[]>();
    allTasks.filter((t) => !t.isPersonal).forEach((t) => {
      const key = t.workflowStepId ?? "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [allTasks]);

  // Counts
  const selectedCount = selectedStepIds.size + selectedTaskIds.size;
  const alreadyInGantt = existingStepIds.size + existingTaskIds.size;

  function toggleSection(section: string) {
    setExpandedSections((p) => {
      const n = new Set(p);
      n.has(section) ? n.delete(section) : n.add(section);
      return n;
    });
  }

  function toggleStep(stepId: string) {
    setExpandedSteps((p) => {
      const n = new Set(p);
      n.has(stepId) ? n.delete(stepId) : n.add(stepId);
      return n;
    });
  }

  function toggleSelectStep(stepId: string) {
    if (existingStepIds.has(stepId)) return;
    setSelectedStepIds((p) => {
      const n = new Set(p);
      n.has(stepId) ? n.delete(stepId) : n.add(stepId);
      return n;
    });
  }

  function toggleSelectTask(taskId: string) {
    if (existingTaskIds.has(taskId)) return;
    setSelectedTaskIds((p) => {
      const n = new Set(p);
      n.has(taskId) ? n.delete(taskId) : n.add(taskId);
      return n;
    });
  }

  function selectAllInSection(section: string) {
    const steps = stepsBySection.get(section) ?? [];
    setSelectedStepIds((p) => {
      const n = new Set(p);
      steps.forEach((s) => { if (!existingStepIds.has(s.id)) n.add(s.id); });
      return n;
    });
    steps.forEach((s) => {
      const tasks = tasksByStep.get(s.id) ?? [];
      setSelectedTaskIds((p) => {
        const n = new Set(p);
        tasks.forEach((t) => { if (!existingTaskIds.has(t.id)) n.add(t.id); });
        return n;
      });
    });
  }

  function selectAll() {
    const allStepIds = new Set(activeSteps.filter((s) => !existingStepIds.has(s.id)).map((s) => s.id));
    const allTaskIds = new Set(allTasks.filter((t) => !t.isPersonal && !existingTaskIds.has(t.id)).map((t) => t.id));
    setSelectedStepIds(allStepIds);
    setSelectedTaskIds(allTaskIds);
  }

  async function handleImport() {
    if (selectedCount === 0) return;
    setImporting(true);
    try {
      const items = [
        ...[...selectedStepIds].map((id) => ({ stepId: id })),
        ...[...selectedTaskIds].map((id) => ({ taskId: id })),
      ];
      await importGanttItems(projectId, items);
      const freshEntries = await getGanttEntries(projectId);
      onDone(freshEntries);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl border shadow-xl flex flex-col w-full max-w-lg max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <h2 className="text-sm font-semibold">Import from Workflow</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select steps and tasks to add to the schedule.
              {alreadyInGantt > 0 && ` (${alreadyInGantt} already in schedule)`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="size-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="px-5 py-2 border-b flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-primary hover:underline"
          >
            Select all
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            type="button"
            onClick={() => { setSelectedStepIds(new Set()); setSelectedTaskIds(new Set()); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
          {selectedCount > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {selectedCount} selected
            </span>
          )}
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {SECTION_ORDER.map((section) => {
            const sectionSteps = stepsBySection.get(section) ?? [];
            if (sectionSteps.length === 0) return null;
            const isExpanded = expandedSections.has(section);

            return (
              <div key={section} className="mb-1">
                {/* Section header */}
                <div className="flex items-center gap-1 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer group">
                  <button
                    type="button"
                    className="flex items-center gap-1 flex-1 text-left"
                    onClick={() => toggleSection(section)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-foreground">
                      {SECTION_LABELS[section] ?? section}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({sectionSteps.length})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectAllInSection(section)}
                    className="text-[10px] text-primary opacity-0 group-hover:opacity-100 hover:underline shrink-0 pr-1"
                  >
                    Select all
                  </button>
                </div>

                {/* Steps */}
                {isExpanded && sectionSteps.map((step) => {
                  const stepTasks = tasksByStep.get(step.id) ?? [];
                  const isStepExpanded = expandedSteps.has(step.id);
                  const isInGantt = existingStepIds.has(step.id);
                  const isSelected = selectedStepIds.has(step.id);

                  return (
                    <div key={step.id} className="ml-5">
                      {/* Step row */}
                      <div
                        className={cn(
                          "flex items-center gap-2 py-1 px-1 rounded",
                          !isInGantt && "cursor-pointer hover:bg-muted/30"
                        )}
                      >
                        {/* Expand tasks toggle */}
                        {stepTasks.length > 0 ? (
                          <button type="button" onClick={() => toggleStep(step.id)} className="shrink-0">
                            {isStepExpanded ? (
                              <ChevronDown className="size-3 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-3 text-muted-foreground" />
                            )}
                          </button>
                        ) : (
                          <span className="size-3 shrink-0" />
                        )}

                        {/* Select checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleSelectStep(step.id)}
                          disabled={isInGantt}
                          className={cn("shrink-0", isInGantt && "opacity-40 cursor-default")}
                        >
                          {isInGantt ? (
                            <CheckSquare className="size-3.5 text-emerald-500" />
                          ) : isSelected ? (
                            <CheckSquare className="size-3.5 text-primary" />
                          ) : (
                            <Square className="size-3.5 text-muted-foreground" />
                          )}
                        </button>

                        <span
                          className={cn(
                            "text-[13px] flex-1 truncate",
                            isInGantt && "text-muted-foreground",
                            !isInGantt && "text-foreground font-medium"
                          )}
                          onClick={() => toggleSelectStep(step.id)}
                        >
                          {step.name}
                        </span>

                        {isInGantt && (
                          <span className="text-[10px] text-emerald-600 shrink-0">In schedule</span>
                        )}
                        {step.dueDate && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            Due {new Date(step.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>

                      {/* Task children */}
                      {isStepExpanded && stepTasks.map((task) => {
                        const isTaskInGantt = existingTaskIds.has(task.id);
                        const isTaskSelected = selectedTaskIds.has(task.id);

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "flex items-center gap-2 py-0.5 px-1 rounded ml-6",
                              !isTaskInGantt && "cursor-pointer hover:bg-muted/30"
                            )}
                            onClick={() => toggleSelectTask(task.id)}
                          >
                            <button
                              type="button"
                              disabled={isTaskInGantt}
                              className={cn("shrink-0", isTaskInGantt && "opacity-40 cursor-default")}
                            >
                              {isTaskInGantt ? (
                                <CheckSquare className="size-3 text-emerald-500" />
                              ) : isTaskSelected ? (
                                <CheckSquare className="size-3 text-primary" />
                              ) : (
                                <Square className="size-3 text-muted-foreground" />
                              )}
                            </button>
                            <span
                              className={cn(
                                "text-[12px] flex-1 truncate",
                                isTaskInGantt ? "text-muted-foreground" : "text-foreground"
                              )}
                            >
                              {task.title}
                            </span>
                            {isTaskInGantt && (
                              <span className="text-[10px] text-emerald-600 shrink-0">In schedule</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground">
            {selectedCount > 0 ? `${selectedCount} item${selectedCount !== 1 ? "s" : ""} selected` : "No items selected"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={importing}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
            >
              {importing ? (
                "Adding…"
              ) : (
                <>
                  <Upload className="mr-1.5 size-3.5" />
                  Add to Schedule
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
