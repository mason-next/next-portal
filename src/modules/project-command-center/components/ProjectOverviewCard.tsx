"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Ban, Building2, ExternalLink, Users } from "lucide-react";
import { bulkAutoAssignSteps, type BulkAutoAssignResult } from "@/lib/data/workflow";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "@/components/shared/CollapsibleCard";
import { EditProjectOverviewModal } from "@/components/shared/AppShell/EditProjectOverviewModal";
import { DeleteProjectModal } from "@/components/shared/AppShell/DeleteProjectModal";
import { ProjectBriefModal } from "@/modules/project-brief/components/ProjectBriefModal";
import { UserInlineLabel } from "@/components/shared/UserInlineLabel";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import { useSession } from "@/lib/auth/client";
import { formatCalendarDate, formatMoney } from "@/lib/utils";
import { ROLE_NOT_NEEDED } from "@/lib/role-assignment";
import type { ProjectTechnicianEntry } from "@/types/subcontractor";

export function ProjectOverviewCard() {
  const router = useRouter();
  const session = useSession();
  const { project, setProject } = useProjectContext();
  const { steps, refetch: refetchWorkflowSteps } = useWorkflowStepsContext();
  const { users } = useUsersContext();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [showAutoAssign, setShowAutoAssign] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState<BulkAutoAssignResult | null>(null);
  const [autoAssignRunning, setAutoAssignRunning] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const isAdmin = session.roleTypes.includes("Administrator");
  const canEdit = isAdmin || session.roleTypes.some((r) => !["Customer", "Subcontractor"].includes(r));

  const userById = (id: string | null) => users.find((u) => u.id === id) ?? null;
  const roleLabel = (id: string | null) =>
    id === ROLE_NOT_NEEDED ? (
      <span className="text-muted-foreground">Not Needed</span>
    ) : (
      <UserInlineLabel user={userById(id)} />
    );

  async function handleAutoAssign() {
    if (!project) return;
    setAutoAssignRunning(true);
    try {
      const result = await bulkAutoAssignSteps(project.id, overwriteExisting);
      setAutoAssignResult(result);
      refetchWorkflowSteps();
    } catch (err) {
      console.error("[AutoAssign] failed:", err);
    } finally {
      setAutoAssignRunning(false);
    }
  }

  if (!project) return null;

  const cwUrl = project.connectwiseUrl;

  return (
    <CollapsibleCard
      title="Project Overview"
      storageKey="project-overview"
      headerExtra={
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setShowBrief(true)}>
            Brief Report
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAutoAssign(true); setAutoAssignResult(null); setOverwriteExisting(false); }}
            >
              <Users className="mr-1.5 size-3.5" />
              Auto-Assign
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
              Edit
            </Button>
          )}
          {cwUrl ? (
            <a
              href={cwUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Open in ConnectWise"
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground/40 cursor-not-allowed"
              title="No ConnectWise link added"
            >
              <ExternalLink className="size-3.5" />
            </button>
          )}
          {isAdmin && (
            <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
              Delete
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        <Field label="Contract Value" value={formatMoney(project.contractValue)} />
        <Field label="Gross Profit" value={formatMoney(project.grossProfit)} />
        <Field
          label="Solution Project Manager"
          value={<UserInlineLabel user={userById(project.fieldProjectManagerId)} />}
        />
        <Field label="Senior Inside PM" value={roleLabel(project.seniorInsideId)} />
        <Field label="Inside PM" value={roleLabel(project.insidePMId)} />
        <Field label="Solutions Engineer" value={roleLabel(project.solutionsEngineerId)} />
        <Field label="Solutions Executive" value={roleLabel(project.solutionsExecutiveId)} />
        <Field
          label="Technicians"
          value={<TechniciansList entries={project.technicians} notNeeded={project.technicianNotNeeded} />}
          fullWidth={project.technicians.length > 2}
        />
        <Field label="Start Date" value={formatCalendarDate(project.createdAt)} />
        <Field label="Target Completion" value={formatCalendarDate(project.targetCompletionDate)} />
      </div>

      {showAutoAssign ? (
        <div className="mt-4 rounded-lg border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Auto-Assign Workflow Steps</h3>
            <button
              type="button"
              onClick={() => setShowAutoAssign(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
          {autoAssignResult === null ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Assigns each unowned workflow step to the matching team member based on their role.
              </p>
              <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                />
                Also overwrite steps that already have an owner
              </label>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleAutoAssign} disabled={autoAssignRunning}>
                  {autoAssignRunning ? "Running…" : "Run Auto-Assign"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAutoAssign(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-sm">
              {autoAssignResult.assigned.length > 0 && (
                <div>
                  <p className="mb-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                    ✓ {autoAssignResult.assigned.length} step{autoAssignResult.assigned.length !== 1 ? "s" : ""} assigned
                  </p>
                  <ul className="space-y-0.5 pl-2 text-muted-foreground">
                    {autoAssignResult.assigned.map((s) => (
                      <li key={s.key}>
                        {s.name} → <span className="font-medium text-foreground">{s.ownerName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {autoAssignResult.skippedAlreadyOwned.length > 0 && (
                <div>
                  <p className="mb-1.5 font-medium text-amber-700 dark:text-amber-400">
                    ↷ {autoAssignResult.skippedAlreadyOwned.length} skipped — already owned
                  </p>
                  <ul className="space-y-0.5 pl-2 text-muted-foreground">
                    {autoAssignResult.skippedAlreadyOwned.map((s) => (
                      <li key={s.key}>{s.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {autoAssignResult.skippedNoRole.length > 0 && (
                <div>
                  <p className="mb-1.5 font-medium text-muted-foreground">
                    — {autoAssignResult.skippedNoRole.length} skipped — no matching role on project
                  </p>
                  <ul className="space-y-0.5 pl-2 text-muted-foreground">
                    {autoAssignResult.skippedNoRole.map((s) => (
                      <li key={s.key}>{s.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {autoAssignResult.assigned.length === 0 &&
               autoAssignResult.skippedAlreadyOwned.length === 0 &&
               autoAssignResult.skippedNoRole.length === 0 && (
                <p className="text-muted-foreground">No template steps with role assignments found.</p>
              )}
              <Button variant="outline" size="sm" onClick={() => { setAutoAssignResult(null); }}>
                Run again
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {showEdit ? (
        <EditProjectOverviewModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setProject(updated);
            refetchWorkflowSteps();
            setShowEdit(false);
          }}
        />
      ) : null}

      {showDelete ? (
        <DeleteProjectModal
          project={project}
          onClose={() => setShowDelete(false)}
          onDeleted={() => router.push("/projects")}
        />
      ) : null}

      {showBrief ? (
        <ProjectBriefModal
          project={project}
          steps={steps}
          users={users}
          onClose={() => setShowBrief(false)}
        />
      ) : null}
    </CollapsibleCard>
  );
}

function TechniciansList({ entries, notNeeded }: { entries: ProjectTechnicianEntry[]; notNeeded: boolean }) {
  if (notNeeded) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
        <Ban className="h-3.5 w-3.5" />
        Not Needed
      </span>
    );
  }
  if (entries.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {entries.map((e) => (
        <span key={e.id || e.userId || e.subcontractorId} className="inline-flex items-center gap-1.5 text-sm">
          {e.userId ? (
            <UserAvatarImage name={e.userName ?? ""} avatarUrl={e.avatarUrl} size={18} />
          ) : (
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="font-medium">{e.userName ?? e.subcontractorName ?? "Unknown"}</span>
          {e.subcontractorId && e.trade && (
            <span className="text-xs text-muted-foreground">({e.trade})</span>
          )}
        </span>
      ))}
    </div>
  );
}

function Field({ label, value, fullWidth }: { label: string; value: ReactNode; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "col-span-2" : undefined}>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
