import { renderEmailHtml, renderEmailPlainText } from "../engine/render";
import type { EmailContact, EmailSection, EmailTemplateContent } from "../engine/types";
import {
  INSIDE_PROJECT_MANAGER_NAME,
  MANAGING_DIRECTOR_NAME,
  SR_INSIDE_PROJECT_MANAGER_NAME,
} from "@/lib/org-roles";

function firstNameOf(fullName: string): string {
  return fullName.split(/\s+/)[0];
}

export const DEFAULT_WELCOME_LETTER_INTRO = [
  "We appreciate the opportunity to work with you on this project and are excited to get things moving.",
  "With the PO in place, our team is getting aligned internally and prioritizing execution to keep everything on track.",
];

export const DEFAULT_WELCOME_LETTER_CLOSING = [
  "As we move forward, we’ll stay closely coordinated with you on scheduling and next steps as we work toward your go-live target.",
  "If there are any site requirements, such as badging, access forms, parking, or other coordination items, feel free to send those over so we can plan ahead and avoid any delays.",
  "Looking forward to working together and getting this across the finish line.",
];

export function defaultWelcomeLetterGreeting(customerName: string): string {
  return `Welcome ${customerName} Team!`;
}

export interface WelcomeLetterInput {
  customerName: string;
  projectName: string;
  projectNumber: string;
  fieldProjectManagerName: string | null;
  fieldProjectManagerAvatarUrl?: string | null;
  solutionsEngineerName: string | null;
  solutionsEngineerAvatarUrl?: string | null;
  solutionsExecutiveName: string | null;
  solutionsExecutiveAvatarUrl?: string | null;
  srInsideProjectManagerAvatarUrl?: string | null;
  insideProjectManagerAvatarUrl?: string | null;
  managingDirectorAvatarUrl?: string | null;
}

export interface WelcomeLetterOverrides {
  greeting?: string;
  intro?: string[];
  closing?: string[];
}

export interface EmailTemplateResult {
  subject: string;
  html: string;
  plainText: string;
}

export function buildWelcomeLetterEmail(
  input: WelcomeLetterInput,
  overrides?: WelcomeLetterOverrides
): EmailTemplateResult {
  const subject = `Welcome to Your Project – ${input.projectName} (#${input.projectNumber})`;
  const greeting = overrides?.greeting ?? defaultWelcomeLetterGreeting(input.customerName);

  const projectTeamContacts: EmailContact[] = [];
  if (input.fieldProjectManagerName) {
    projectTeamContacts.push({
      role: "Field Project Manager",
      name: input.fieldProjectManagerName,
      avatarUrl: input.fieldProjectManagerAvatarUrl,
      blurb: `${firstNameOf(input.fieldProjectManagerName)} will oversee onsite execution, field coordination, and ensure installation activities are aligned with the overall project schedule.`,
    });
  }
  projectTeamContacts.push(
    {
      role: "Sr. Inside Project Manager",
      name: SR_INSIDE_PROJECT_MANAGER_NAME,
      avatarUrl: input.srInsideProjectManagerAvatarUrl,
      blurb: `${firstNameOf(SR_INSIDE_PROJECT_MANAGER_NAME)} will be your primary point of contact and will oversee all coordination, scheduling, and day-to-day communication.`,
    },
    {
      role: "Inside Project Manager",
      name: INSIDE_PROJECT_MANAGER_NAME,
      avatarUrl: input.insideProjectManagerAvatarUrl,
      blurb: `${firstNameOf(INSIDE_PROJECT_MANAGER_NAME)} will be supporting ${firstNameOf(SR_INSIDE_PROJECT_MANAGER_NAME)} and helping drive timelines, logistics, and overall project flow.`,
    }
  );

  const engineeringContacts: EmailContact[] = [];
  if (input.solutionsEngineerName) {
    engineeringContacts.push({
      role: "Principal Solutions Engineer",
      name: input.solutionsEngineerName,
      avatarUrl: input.solutionsEngineerAvatarUrl,
      blurb: `${firstNameOf(input.solutionsEngineerName)} is leading the technical execution, ensuring the system is implemented, tested, and delivered to meet your expectations.`,
    });
  }

  const accountContacts: EmailContact[] = [];
  if (input.solutionsExecutiveName) {
    accountContacts.push({
      role: "Solutions Executive",
      name: input.solutionsExecutiveName,
      avatarUrl: input.solutionsExecutiveAvatarUrl,
      blurb: `${firstNameOf(input.solutionsExecutiveName)} will remain closely involved to ensure alignment from both a technical and account perspective throughout the project.`,
    });
  }

  const sections: EmailSection[] = [
    { heading: "Your Project Team", contacts: projectTeamContacts },
    ...(engineeringContacts.length ? [{ heading: "Engineering / Delivery", contacts: engineeringContacts }] : []),
    ...(accountContacts.length ? [{ heading: "Account Team", contacts: accountContacts }] : []),
    {
      heading: "Leadership Team",
      contacts: [
        {
          role: "Managing Director",
          name: MANAGING_DIRECTOR_NAME,
          avatarUrl: input.managingDirectorAvatarUrl,
          blurb:
            "I’ll be supporting overall execution and alignment across our teams. If anything requires escalation or additional attention at any point, please don’t hesitate to reach out directly.",
        },
      ],
    },
  ];

  const content: EmailTemplateContent = {
    greeting,
    intro: overrides?.intro ?? DEFAULT_WELCOME_LETTER_INTRO,
    sections,
    closing: overrides?.closing ?? DEFAULT_WELCOME_LETTER_CLOSING,
    signOffLine: "Best regards,",
    signatureLines: [MANAGING_DIRECTOR_NAME],
  };

  return {
    subject,
    html: renderEmailHtml(content),
    plainText: renderEmailPlainText(content, subject),
  };
}
