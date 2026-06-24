// Always invited to every Internal Kickoff, in addition to the project's assigned team.
export const STANDING_ATTENDEE_EMAILS = ["sverissimo@mason247.com", "abehan@mason247.com"];

// Standing agenda used for every Internal Kickoff unless the organizer edits it.
export const DEFAULT_KICKOFF_AGENDA = `Pre-Work (Required):
• Review project scope, BOM, and drawings
• Review project folder and existing documentation
• Come prepared with risks, gaps, and questions

Agenda (30 Minutes):

1. Project Snapshot (3 min)
• Scope, timeline, key objectives

2. Critical Scope & Technical Highlights (7 min)
• Key systems, integrations, complexities
• GUI requirements (if applicable)

3. Schedule, Procurement & Closeout Requirements (7 min)
• Milestones and long-lead items
• Equipment readiness:
  o Firmware updates
  o Manuals collection
  o Serial numbers / MAC addresses
• Packing lists & acquisition tags (if required)

4. Roles & Execution Plan (5 min)
• Ownership (PM, Engineering, Field, Procurement)
• Remote access expectations for client
• Warranty, support, and help desk alignment

5. Risks, Constraints & Documentation (5 min)
• Top risks and site constraints
• As-builts, project folder, and file accuracy
• Colors, finishes, millwork (if applicable)

6. Next Steps & Actions (3 min)
• Immediate actions and owners
• Billing sequencing and closeout alignment`;

export interface TeamsMeetingInput {
  subject: string;
  attendees: string[]; // emails
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  content?: string;
}

// Microsoft's documented "deep link to schedule a meeting" — opens Teams (web or desktop)
// straight to a New Meeting compose pane prefilled with these details. There's no Graph API
// integration in this app, so the actual invite still has to be reviewed and sent from
// Teams itself; this is the same best-effort external-handoff pattern as the Outlook
// mailto: draft used elsewhere (see EmailPreviewModal.openMailto).
export function buildTeamsMeetingUrl(input: TeamsMeetingInput): string {
  const params = new URLSearchParams({
    subject: input.subject,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  if (input.attendees.length > 0) params.set("attendees", input.attendees.join(","));
  if (input.content) params.set("content", input.content);
  return `https://teams.microsoft.com/l/meeting/new?${params.toString()}`;
}
