import { renderEmailHtml, renderEmailPlainText } from "../engine/render";
import type { EmailSection, EmailTemplateContent } from "../engine/types";
import { MANAGING_DIRECTOR_NAME } from "@/lib/org-roles";
import { formatCalendarDate } from "@/lib/utils";
import type { ProjectBriefData } from "@/modules/project-brief/lib/build-project-brief";

export const DEFAULT_PROJECT_BRIEF_INTRO = [
  "Here's a quick update on where things currently stand with your project.",
];

export const DEFAULT_PROJECT_BRIEF_CLOSING = [
  "We'll keep you posted as things progress — reach out anytime if you have questions in the meantime.",
];

export function defaultProjectBriefGreeting(customerName: string): string {
  return `Project Update for ${customerName}`;
}

export interface ProjectBriefOverrides {
  greeting?: string;
  intro?: string[];
  closing?: string[];
}

export interface ProjectBriefEmailResult {
  subject: string;
  html: string;
  plainText: string;
}

export function buildProjectBriefEmail(
  data: ProjectBriefData,
  overrides?: ProjectBriefOverrides
): ProjectBriefEmailResult {
  const subject = `Project Brief – ${data.projectName} (#${data.projectNumber})`;
  const greeting = overrides?.greeting ?? defaultProjectBriefGreeting(data.customerName);

  const statusIntro = [
    `Current Phase: ${data.currentPhaseLabel}`,
    data.targetCompletionDate ? `Target Completion: ${formatCalendarDate(data.targetCompletionDate)}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const sections: EmailSection[] = [
    {
      heading: "Project Status",
      intro: statusIntro,
      stats: [{ label: "Overall Progress", percent: data.overallProgress }],
    },
    {
      heading: "Phase Breakdown",
      stats: data.phases.map((p) => ({ label: p.label, percent: p.percent })),
    },
    ...(data.recentMilestones.length
      ? [{ heading: "Recently Completed", notes: data.recentMilestones } as EmailSection]
      : []),
    // Status Updates: comments tagged "Status" in the Project Activity feed.
    // Each entry formatted as "Month Day, Year — Author: text" so the customer sees date context.
    ...(data.statusUpdates.length
      ? [
          {
            heading: "Status Updates",
            notes: data.statusUpdates.map(
              (u) => `${u.date} — ${u.author}: ${u.text}`
            ),
          } as EmailSection,
        ]
      : []),
    ...(data.contacts.length
      ? [
          {
            heading: "Your Project Contacts",
            contacts: data.contacts.map((c) => ({
              role: c.role,
              name: c.name,
              avatarUrl: c.avatarUrl,
              blurb: [c.email, c.phone].filter(Boolean).join("  ·  "),
            })),
          } as EmailSection,
        ]
      : []),
  ];

  const content: EmailTemplateContent = {
    greeting,
    intro: overrides?.intro ?? DEFAULT_PROJECT_BRIEF_INTRO,
    sections,
    closing: overrides?.closing ?? DEFAULT_PROJECT_BRIEF_CLOSING,
    signOffLine: "Best regards,",
    signatureLines: [MANAGING_DIRECTOR_NAME],
  };

  return {
    subject,
    html: renderEmailHtml(content),
    plainText: renderEmailPlainText(content, subject),
  };
}
