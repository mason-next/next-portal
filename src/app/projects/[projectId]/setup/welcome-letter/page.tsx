"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import {
  buildWelcomeLetterEmail,
  DEFAULT_WELCOME_LETTER_CLOSING,
  DEFAULT_WELCOME_LETTER_INTRO,
  defaultWelcomeLetterGreeting,
  type WelcomeLetterOverrides,
} from "@/modules/email-templates/templates/welcome-letter";
import { getWelcomeLetterRecord, saveWelcomeLetterRecord, type WelcomeLetterRecord } from "@/modules/welcome-letter/lib/store";
import { EditWelcomeLetterModal } from "@/modules/welcome-letter/components/EditWelcomeLetterModal";
import { WelcomeLetterPreviewModal } from "@/modules/welcome-letter/components/WelcomeLetterPreviewModal";
import { logProjectActivity } from "@/lib/data/activity";
import { useSession } from "@/lib/auth/client";
import {
  INSIDE_PROJECT_MANAGER_NAME,
  MANAGING_DIRECTOR_NAME,
  SR_INSIDE_PROJECT_MANAGER_NAME,
} from "@/lib/org-roles";
import { formatDate } from "@/lib/utils";

export default function WelcomeLetterPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { name: currentUserName } = useSession();
  const { project } = useProjectContext();
  const { users } = useUsersContext();
  const { refetch: refetchWorkflowSteps } = useWorkflowStepsContext();

  const [record, setRecord] = useState<WelcomeLetterRecord | null | undefined>(undefined);
  const [overrides, setOverrides] = useState<WelcomeLetterOverrides>({});
  const [showPreview, setShowPreview] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getWelcomeLetterRecord(projectId).then((loaded) => {
      if (active) setRecord(loaded);
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  }

  if (!project || record === undefined) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const userById = (id: string | null) => users.find((u) => u.id === id) ?? null;
  const userByName = (name: string) => users.find((u) => u.name === name) ?? null;

  const fieldProjectManager = userById(project.fieldProjectManagerId);
  const solutionsEngineer = userById(project.solutionsEngineerId);
  const solutionsExecutive = userById(project.solutionsExecutiveId);
  // Standing org-wide roles (lib/org-roles.ts) aren't tied to a project field — resolved by
  // name against the user roster instead, same as their seeded AppUser records.
  const srInsideProjectManager = userByName(SR_INSIDE_PROJECT_MANAGER_NAME);
  const insideProjectManager = userByName(INSIDE_PROJECT_MANAGER_NAME);
  const managingDirector = userByName(MANAGING_DIRECTOR_NAME);

  const email = buildWelcomeLetterEmail(
    {
      customerName: project.customerName,
      projectName: project.name,
      projectNumber: project.projectNumber,
      fieldProjectManagerName: fieldProjectManager?.name ?? null,
      fieldProjectManagerAvatarUrl: fieldProjectManager?.avatarUrl,
      solutionsEngineerName: solutionsEngineer?.name ?? null,
      solutionsEngineerAvatarUrl: solutionsEngineer?.avatarUrl,
      solutionsExecutiveName: solutionsExecutive?.name ?? null,
      solutionsExecutiveAvatarUrl: solutionsExecutive?.avatarUrl,
      srInsideProjectManagerAvatarUrl: srInsideProjectManager?.avatarUrl,
      insideProjectManagerAvatarUrl: insideProjectManager?.avatarUrl,
      managingDirectorAvatarUrl: managingDirector?.avatarUrl,
    },
    overrides
  );

  async function copyHtml() {
    await navigator.clipboard.writeText(email.html);
    showToast("Copied HTML to clipboard");
  }

  async function openMailto() {
    try {
      const htmlBlob = new Blob([email.html], { type: "text/html" });
      const textBlob = new Blob([email.plainText], { type: "text/plain" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob })]);
    } catch {
      // Clipboard access denied — the draft will just open blank with nothing to paste.
    }
    window.location.href = `mailto:?subject=${encodeURIComponent(email.subject)}`;
    showToast("Draft opened — paste (Ctrl+V) into the body for the formatted email");
  }

  async function handleMarkComplete() {
    setSubmitting(true);
    const now = new Date().toISOString();
    const newRecord: WelcomeLetterRecord = {
      subject: email.subject,
      html: email.html,
      plainText: email.plainText,
      sentBy: currentUserName,
      sentAt: now,
    };
    await saveWelcomeLetterRecord(projectId, newRecord);
    await logProjectActivity(projectId, {
      category: "system",
      activityType: "welcome_letter_sent",
      userName: currentUserName,
      message: `Welcome letter sent by ${currentUserName}`,
    });
    refetchWorkflowSteps();
    setRecord(newRecord);
    setSubmitting(false);
    showToast("Welcome letter marked complete");
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
        <div className="mb-1 text-sm font-semibold">Send Welcome Letter</div>
        <p className="mb-4 text-sm text-muted-foreground">
          Generate the project kickoff welcome email, pulled live from the team assigned under Project Overview.
        </p>

        {record ? (
          <p className="mb-4 rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">
            Sent on {formatDate(record.sentAt)} by {record.sentBy}.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            Preview Welcome Letter
          </Button>
          <Button variant="outline" onClick={() => setShowEdit(true)}>
            Edit Email
          </Button>
          <Button variant="outline" onClick={copyHtml}>
            Copy HTML
          </Button>
          <Button variant="outline" onClick={openMailto}>
            Open Outlook Draft
          </Button>
          <Button onClick={handleMarkComplete} disabled={submitting}>
            {submitting ? "Saving…" : "Mark Complete"}
          </Button>
        </div>
      </div>

      {showPreview ? (
        <WelcomeLetterPreviewModal
          subject={email.subject}
          customerName={project.customerName}
          html={email.html}
          onClose={() => setShowPreview(false)}
        />
      ) : null}

      {showEdit ? (
        <EditWelcomeLetterModal
          greeting={overrides.greeting ?? defaultWelcomeLetterGreeting(project.customerName)}
          intro={overrides.intro ?? DEFAULT_WELCOME_LETTER_INTRO}
          closing={overrides.closing ?? DEFAULT_WELCOME_LETTER_CLOSING}
          onClose={() => setShowEdit(false)}
          onSave={setOverrides}
        />
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 rounded-md bg-foreground px-3.5 py-2.5 text-sm text-background shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
