// Standing agenda for every Technical Kickoff unless the organizer edits it.
export const DEFAULT_TKO_AGENDA = `Pre-Work (Required):
• Review project scope, BOM, drawings, and existing documentation
• Review any CAD/engineering deliverables already completed
• Come prepared with technical questions, risks, and clarifications

Agenda (45 Minutes):

1. Project Overview (5 min)
• Scope summary, timeline, and key technical objectives
• Contract scope vs. current design — gaps or changes since close

2. Engineering Review (10 min)
• CAD review status and open items
• BOM status — any items with concerns (Pending Verification, Swap/Replace)
• Long-lead items and procurement risks

3. Technical Execution Plan (10 min)
• System design walkthrough (integrations, network, GUI)
• Programming and configuration requirements
• Firmware and software version alignment

4. Site & Installation Requirements (8 min)
• Site conditions, access, and constraints
• Infrastructure readiness (power, conduit, backboards, network)
• Remote access and network requirements for client

5. Commissioning & Testing Plan (7 min)
• Testing methodology and sign-off requirements
• Customer acceptance criteria
• Documentation requirements (as-builts, test reports, O&M)

6. Roles, Actions & Next Steps (5 min)
• Engineering, field, and procurement ownership
• Immediate open actions and owners
• Follow-up meeting or milestone schedule`;

export interface TeamsMeetingInput {
  subject: string;
  attendees: string[]; // emails
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  content?: string;
}

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
