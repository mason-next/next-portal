"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import {
  getTechnicalKickoffRecord,
  saveTechnicalKickoffRecord,
  type TechnicalKickoffRecord,
} from "@/modules/technical-kickoff/lib/store";
import { buildTeamsMeetingUrl, DEFAULT_TKO_AGENDA } from "@/modules/technical-kickoff/lib/teams-invite";
import { logProjectActivity } from "@/lib/data/activity";
import { getMeetingDefaults } from "@/lib/data/system-defaults";
import { useSession } from "@/lib/auth/client";
import { formatDate } from "@/lib/utils";
import type { AssigneeTarget } from "@/lib/data/system-defaults";
import type { AppUser } from "@/types/user";

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

function resolveTargetsClientSide(targets: AssigneeTarget[], users: AppUser[]): AppUser[] {
  const result: AppUser[] = [];
  for (const t of targets) {
    if (t.kind === "user") {
      const u = users.find((u) => u.id === t.value && u.isActive);
      if (u) result.push(u);
    } else {
      users.filter((u) => u.isActive && u.roleTypes.includes(t.value)).forEach((u) => result.push(u));
    }
  }
  return result;
}

const FIELD_INPUT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

export default function TechnicalKickoffPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { name: currentUserName } = useSession();
  const { project } = useProjectContext();
  const { users } = useUsersContext();
  const { refetch: refetchWorkflowSteps } = useWorkflowStepsContext();

  const [record, setRecord] = useState<TechnicalKickoffRecord | null | undefined>(undefined);
  const [standingAttendeeTargets, setStandingAttendeeTargets] = useState<AssigneeTarget[]>([]);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(45);
  const [agenda, setAgenda] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getTechnicalKickoffRecord(projectId)
      .then((loaded) => { if (active) setRecord(loaded); })
      .catch(() => { if (active) setRecord(null); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    let active = true;
    getMeetingDefaults("technical-kickoff").then((d) => {
      if (active) setStandingAttendeeTargets(d.standingAttendees);
    });
    return () => { active = false; };
  }, []);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  }

  if (!project || record === undefined) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const defaultSubject = `Technical Kickoff – ${project.name}`;
  const effectiveSubject = subject.trim() || defaultSubject;
  const effectiveAgenda = agenda.trim() || DEFAULT_TKO_AGENDA;

  const userById = (id: string | null | undefined) => users.find((u) => u.id === id) ?? null;

  // TKO default attendees: Solutions PM (insidePMId), Solutions Engineer, Solutions Executive.
  // Field PM is omitted — TKO is solutions/engineering focused, not field execution.
  const roleAttendeeIds = [
    project.insidePMId,
    project.solutionsEngineerId,
    project.solutionsExecutiveId,
  ];

  const roleAttendeeDetails = roleAttendeeIds
    .map(userById)
    .filter((u): u is NonNullable<typeof u> => u !== null && u.email.trim() !== "");

  // Resolve standing attendees (from system defaults) client-side.
  const standingUsers = resolveTargetsClientSide(standingAttendeeTargets, users);

  // Merge role-based + standing attendees, deduped by user ID.
  const attendees = [
    ...new Map([...roleAttendeeDetails, ...standingUsers].map((u) => [u.id, u])).values(),
  ];

  // Show which roles are missing (no user assigned to that role).
  const missingRoles: string[] = [];
  if (!project.insidePMId)           missingRoles.push("Solutions Project Manager");
  if (!project.solutionsEngineerId)  missingRoles.push("Solutions Engineer");
  if (!project.solutionsExecutiveId) missingRoles.push("Solutions Executive");

  const allAttendeeEmails = attendees.map((a) => a.email);

  const startTime = date && time ? new Date(`${date}T${time}`).toISOString() : null;
  const endTime = startTime ? new Date(new Date(startTime).getTime() + duration * 60000).toISOString() : null;
  const canSchedule = startTime !== null && endTime !== null;

  function openTeamsInvite() {
    if (!startTime || !endTime) return;
    const url = buildTeamsMeetingUrl({
      subject: effectiveSubject,
      attendees: allAttendeeEmails,
      startTime,
      endTime,
      content: effectiveAgenda,
    });
    window.open(url, "_blank");
  }

  async function copyAttendees() {
    await navigator.clipboard.writeText(allAttendeeEmails.join(", "));
    showToast("Copied attendee emails to clipboard");
  }

  async function handleMarkComplete() {
    if (!startTime || !endTime) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    const newRecord: TechnicalKickoffRecord = {
      subject: effectiveSubject,
      agenda: effectiveAgenda,
      attendees: allAttendeeEmails,
      startTime,
      endTime,
      scheduledBy: currentUserName,
      scheduledAt: now,
    };
    await saveTechnicalKickoffRecord(projectId, newRecord);
    logProjectActivity(projectId, {
      category: "system",
      activityType: "technical_kickoff_scheduled",
      userName: currentUserName,
      message: `Technical kickoff scheduled for ${formatDate(startTime)} by ${currentUserName}`,
    }).catch((err) => console.error("[technical-kickoff] logProjectActivity failed:", err));
    refetchWorkflowSteps();
    setRecord(newRecord);
    setSubmitting(false);
    showToast("Technical kickoff marked complete");
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/projects/${projectId}/setup`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Setup
      </Link>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-1 text-sm font-semibold">Technical Kickoff</div>
        <p className="mb-4 text-sm text-muted-foreground">
          Create a Teams meeting invite for the solutions and engineering team. Attendees are pulled
          from the project team assigned under Project Overview.
        </p>

        {record ? (
          <p className="mb-4 rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">
            Scheduled for {formatDate(record.startTime)} by {record.scheduledBy}.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">Subject</div>
            <input
              type="text"
              className={FIELD_INPUT_CLASS}
              value={subject}
              placeholder={defaultSubject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">Date</div>
            <input type="date" className={FIELD_INPUT_CLASS} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">Start Time</div>
            <input type="time" className={FIELD_INPUT_CLASS} value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">Duration</div>
            <select
              className={FIELD_INPUT_CLASS}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 block">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">Agenda</div>
            <textarea
              className="min-h-64 w-full whitespace-pre-wrap rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              value={agenda || DEFAULT_TKO_AGENDA}
              onChange={(e) => setAgenda(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold text-muted-foreground">Attendees</div>

          {missingRoles.length > 0 && (
            <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
              Missing roles (not assigned on project): {missingRoles.join(", ")}. Assign them under
              Project Overview to include them.
            </p>
          )}

          {attendees.length === 0 ? (
            <p className="mb-1 text-sm text-muted-foreground">
              No solutions team members assigned yet — assign the team from Project Overview first.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {attendees.map((user) => {
                const isStanding = standingUsers.some((s) => s.id === user.id);
                return (
                  <li key={user.id} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{user.name}</span> · {user.email}
                    {isStanding && (
                      <span className="ml-2 text-xs text-muted-foreground">(always invited)</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={openTeamsInvite} disabled={!canSchedule}>
            Open Teams Invite
          </Button>
          <Button variant="outline" onClick={copyAttendees} disabled={allAttendeeEmails.length === 0}>
            Copy Attendee Emails
          </Button>
          <Button variant="outline" onClick={handleMarkComplete} disabled={!canSchedule || submitting}>
            {submitting ? "Saving…" : "Mark Complete"}
          </Button>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 rounded-md bg-foreground px-3.5 py-2.5 text-sm text-background shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
