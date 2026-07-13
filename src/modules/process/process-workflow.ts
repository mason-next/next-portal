// ─── Types ───────────────────────────────────────────────────────────────────

export type Role =
  | 'Solutions Project Manager'
  | 'Solutions Engineer'
  | 'Inside PM'
  | 'Procurement'
  | 'Admin'
  | 'Technician'
  | 'Programmer'
  | 'UX Designer'
  | 'Solutions Executive'
  | 'Solutions Architect'
  | 'CAD Engineer';

export const ALL_ROLES: Role[] = [
  'Solutions Project Manager',
  'Solutions Engineer',
  'Inside PM',
  'Procurement',
  'Admin',
  'Technician',
  'Programmer',
  'UX Designer',
  'Solutions Executive',
  'Solutions Architect',
  'CAD Engineer',
];

export interface MilestoneNode {
  type: 'milestone';
  id: string;
  number: number;
  title: string;
  children?: WorkflowNode[];
}

export interface StageNode {
  type: 'stage';
  id: string;
  title: string;
  meta?: string;
  children?: WorkflowNode[];
}

export interface TaskNode {
  type: 'task';
  id: string;
  title: string;
  summary: string;
  details: string[];
  roles: Role[];
  templates?: string[];
  isCall?: boolean;
  exclusiveGroup?: string;
  wideChildren?: boolean;
  showWhen?: { decisionId: string; option: 'A' | 'B' | 'any' };
  children?: WorkflowNode[];
}

export interface DecisionOption {
  label: string;
  description: string;
  branch?: WorkflowNode[];
}

export interface DecisionNode {
  type: 'decision';
  id: string;
  title: string;
  roles: Role[];
  context?: string;
  showWhen?: { decisionId: string; option: 'A' | 'B' | 'any' };
  optionA: DecisionOption;
  optionB: DecisionOption;
}

export interface Lane {
  name: string;
  nodes: WorkflowNode[];
}

export interface ParallelNode {
  type: 'parallel';
  id: string;
  description: string;
  lanes: Lane[];
}

export type WorkflowNode = MilestoneNode | StageNode | TaskNode | DecisionNode | ParallelNode;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function nodeChildren(node: WorkflowNode): WorkflowNode[] {
  if (node.type === 'milestone') return node.children ?? [];
  if (node.type === 'stage') return node.children ?? [];
  if (node.type === 'task') return node.children ?? [];
  return [];
}

export function flattenWorkflow(nodes: WorkflowNode[]): WorkflowNode[] {
  const result: WorkflowNode[] = [];
  for (const node of nodes) {
    result.push(node);
    const ch = nodeChildren(node);
    if (ch.length) result.push(...flattenWorkflow(ch));
    if (node.type === 'parallel') {
      for (const lane of node.lanes) result.push(...flattenWorkflow(lane.nodes));
    }
    if (node.type === 'decision') {
      if (node.optionA.branch?.length) result.push(...flattenWorkflow(node.optionA.branch));
      if (node.optionB.branch?.length) result.push(...flattenWorkflow(node.optionB.branch));
    }
  }
  return result;
}

export function getNodeTitle(node: WorkflowNode | undefined): string {
  if (!node) return '';
  if (node.type === 'milestone') return `Phase ${node.number}: ${node.title}`;
  if (node.type === 'parallel') return node.description;
  return node.title;
}

export function getNodeRoles(node: WorkflowNode): Role[] {
  if (node.type === 'task' || node.type === 'decision') return node.roles;
  return [];
}

// ─── Workflow Data ────────────────────────────────────────────────────────────

export const WORKFLOW: MilestoneNode[] = [
  // ── Milestone 1: Setup ─────────────────────────────────────────────────────
  {
    type: 'milestone',
    id: 'milestone-1',
    number: 1,
    title: 'Setup',
    children: [
      {
        type: 'task',
        id: 'task-project-opened',
        title: 'Project Opened in ConnectWise',
        summary: 'Triggers automatic notifications and role assignments.',
        details: [
          'ConnectWise opens the project record → triggers automatic notifications and role assignments.',
        ],
        roles: ['Admin'],
        children: [
          {
            type: 'parallel',
            id: 'parallel-three-tracks',
            description: 'Three tracks initiate in parallel (within 48h of PO)',
            lanes: [
              {
                name: 'Engineering',
                nodes: [
                  {
                    type: 'task',
                    id: 'task-engineering-onboarding',
                    title: 'Engineering Onboarding',
                    summary: 'Review project scope at high level and prepare for internal kickoff.',
                    details: [
                      'Review the project scope at a high level.',
                      'Prepare for the internal kickoff: identify questions and background to gather from the Solutions Architect.',
                    ],
                    roles: ['Solutions Engineer'],
                  },
                ],
              },
              {
                name: 'Admin',
                nodes: [
                  {
                    type: 'task',
                    id: 'task-welcome-letter',
                    title: 'Welcome Letter & Project Schedule',
                    summary: 'Welcome Letter dispatched; initial Project Schedule generated.',
                    details: [
                      "Welcome Letter dispatched to customer — project team CC'd.",
                      'Initial Project Schedule generated, adjusted in real time by Solutions Project Manager.',
                    ],
                    roles: ['Admin'],
                    templates: ['Welcome Letter', 'Project Schedule'],
                  },
                  {
                    type: 'task',
                    id: 'task-schedule-kickoff-calls',
                    title: 'Schedule Kickoff Calls',
                    summary: 'Admin schedules internal and customer kickoff calls.',
                    details: [
                      'Schedule internal kickoff call with the project team.',
                      'Schedule customer kickoff call.',
                    ],
                    roles: ['Admin'],
                  },
                ],
              },
              {
                name: 'Procurement',
                nodes: [
                  {
                    type: 'task',
                    id: 'task-procurement-initiated',
                    title: 'Procurement Track Initiated',
                    summary: 'Procurement engaged at PO; long-lead items surfaced for Internal Kickoff.',
                    details: [
                      'Procurement engaged at PO.',
                      'Long-lead items surfaced ahead of the Internal Kickoff for immediate flagging.',
                    ],
                    roles: ['Procurement'],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'task',
        id: 'group-prep-calls',
        title: 'Prep Calls',
        summary: 'Internal and customer-facing kickoff calls.',
        details: [],
        roles: ['Solutions Project Manager', 'Solutions Engineer', 'Inside PM', 'Procurement', 'Admin', 'Solutions Executive', 'Solutions Architect'],
        children: [
          {
            type: 'task',
            id: 'task-internal-kickoff',
            title: 'Internal Kickoff',
            isCall: true,
            summary:
              'Within 48h of PO — Attendees: Solutions Project Manager, SE, Inside PM, Procurement, Solutions Executive, Admin (optional).',
            details: [
              'Review project scope and customer expectations.',
              'Consult with Solutions Architect to understand design intentions and project background.',
              'Identify additional specialists needed: Programmer, UX Designer, CAD, Rack Fab, Commissioning support, or subcontractors.',
              'Confirm auto-assigned resources; flag capacity concerns for escalation.',
              'Confirm timeline targets and major milestones.',
              'Procurement flags long-lead items immediately.',
            ],
            roles: ['Solutions Project Manager', 'Solutions Engineer', 'Inside PM', 'Procurement', 'Solutions Executive', 'Admin', 'Solutions Architect'],
            templates: ['Internal Kickoff Agenda'],
          },
          {
            type: 'task',
            id: 'task-customer-kickoff',
            title: 'Customer Kickoff',
            isCall: true,
            summary: 'Graceful sales-to-operations handoff. Sets expectations for the full project lifecycle.',
            details: [
              'Introduce the assigned project team and establish the primary points of contact going forward.',
              'Review the breadth of the project scope — confirm the customer understands what is and is not included.',
              'Review schedule assumptions: confirm key dates, lead times, and access requirements.',
              'Set expectations for next steps: what happens before installation begins, what communication they will receive.',
              'Acknowledge the transition from Sales to Operations — reinforce confidence in the handoff.',
              'Frame customer expectations: large-scale deployments require preparation time before installation begins.',
            ],
            roles: ['Solutions Project Manager', 'Solutions Executive'],
            templates: ['Customer Kickoff Agenda'],
          },
        ],
      },
      {
        type: 'stage',
        id: 'stage-bom-review',
        title: 'BOM Review',
        meta: 'Owned by Solutions Engineer. Review the BOM for accuracy, completeness, and alignment with design intent.',
        children: [
          {
            type: 'task',
            id: 'task-finishes-approval',
            title: 'Capture Finishes Approval',
            summary: 'Written customer approval for color and finishes of all relevant materials.',
            details: [
              'Written customer approval (email sufficient) confirming color and finishes of all relevant materials.',
              'Deliverable: Finishes Approval on file before any purchasing is released.',
            ],
            roles: ['Solutions Engineer'],
            templates: ['Finishes Approval'],
          },
          {
            type: 'task',
            id: 'task-draft-change-orders-bom',
            title: 'Draft Change Orders (if revisions needed)',
            summary: 'Draft COs if revisions needed; log Engineering Issues Ticket in ConnectWise.',
            details: [
              'Draft change orders if any revisions are needed.',
              'CO generated during BOM review, except for finishes or customer request, should prompt an Engineering Issues Ticket in ConnectWise.',
            ],
            roles: ['Solutions Engineer'],
          },
          {
            type: 'decision',
            id: 'decision-purchasing-release',
            title: 'Full or Partial Purchasing Release?',
            roles: ['Solutions Engineer', 'Procurement'],
            optionA: {
              label: 'FULL RELEASE',
              description: 'All items can be procured. Proceed.',
            },
            optionB: {
              label: 'PARTIAL RELEASE',
              description:
                'Site condition unknowns prevent full procurement. Flag for revisit when clear direction is received.',
            },
          },
          {
            type: 'task',
            id: 'task-clear-for-purchasing',
            title: 'SE Communicates: Clear for Purchasing',
            summary: 'Solutions Engineer signals Procurement to proceed; may handle initial release directly.',
            details: [
              'Solutions Engineer communicates to Procurement: Clear for Purchasing.',
              'SE may release approved items directly to reduce handoff time on initial release.',
              'Subsequent or partial releases may be revisited by the Solutions Project Manager as install needs evolve.',
            ],
            roles: ['Solutions Engineer', 'Procurement'],
          },
        ],
      },
    ],
  },

  // ── Milestone 2: Engineering ────────────────────────────────────────────────
  {
    type: 'milestone',
    id: 'milestone-2',
    number: 2,
    title: 'Engineering',
    children: [
      {
        type: 'stage',
        id: 'stage-engineering-packet',
        title: 'Create Engineering Packet',
        meta: 'Owned by Solutions Engineer. SE may pull in CAD Engineer, Programmer, and UX Designer as needed.',
        children: [
          {
            type: 'parallel',
            id: 'parallel-engineering-tracks',
            description: 'Programming and documentation tracks run in parallel',
            lanes: [
              {
                name: 'Programming',
                nodes: [
                  {
                    type: 'task',
                    id: 'task-functional-narrative',
                    title: 'Functional Narrative',
                    summary:
                      'System capabilities, workflows, and UX expectations — completed before programming.',
                    details: [
                      'Write the functional narrative — system capabilities, customer workflows, expected user experience, interface behavior, and operational expectations.',
                      'An engineering deliverable completed before programming begins.',
                    ],
                    roles: ['Solutions Engineer', 'Programmer'],
                    templates: ['Functional Narrative'],
                  },
                  {
                    type: 'task',
                    id: 'task-ux-design-review',
                    title: 'UX Design Review',
                    summary: 'If needed, for larger projects',
                    details: [
                      'Conducted before programming begins.',
                      'Required for projects with 10+ user interfaces or where consistency across spaces is critical.',
                    ],
                    roles: ['UX Designer', 'Solutions Engineer', 'Programmer'],
                    templates: ['Customer GUI Review'],
                  },
                  {
                    type: 'task',
                    id: 'task-programming-mockups',
                    title: 'Programming Mockups',
                    summary:
                      'GUI mockups based on approved UX direction; incorporated into Functional Narrative.',
                    details: [
                      'After UX approval, Programmer executes GUI mockups based on the approved UX direction.',
                      'Incorporate GUI screenshots into the Functional Narrative.',
                    ],
                    roles: ['Programmer', 'Solutions Engineer'],
                  },
                ],
              },
              {
                name: 'Documentation',
                nodes: [
                  {
                    type: 'task',
                    id: 'task-ip-scope',
                    title: 'IP Scope & Switchport Assignments',
                    summary: 'Complete IP scope, switchport assignments, and document all device credentials.',
                    details: [
                      'Complete IP scope and switchport assignments.',
                      'Document all device credentials within IP scope (carries through to as-built and closeout).',
                    ],
                    roles: ['Solutions Engineer'],
                    templates: ['IP Scope'],
                  },
                  {
                    type: 'task',
                    id: 'task-drawings',
                    title: 'Drawings',
                    summary:
                      'SE submits drawing request to CAD Engineer; final package includes rack and field elevations.',
                    details: [
                      'SE submits drawing request to CAD Engineer.',
                      'Draft sketch if none existing; if a sketch exists, add detail and include switchport assignments.',
                      'SE coordinates when multi-project CAD workloads need balancing.',
                      'Final drawings include both rack and field elevations.',
                    ],
                    roles: ['CAD Engineer', 'Solutions Engineer'],
                    templates: ['Drawing Request'],
                  },
                  {
                    type: 'task',
                    id: 'task-pull-schedule',
                    title: 'Pull Schedule',
                    summary: 'Requested from CAD Engineer if needed.',
                    details: ['Requested from CAD Engineer if needed.'],
                    roles: ['CAD Engineer', 'Solutions Engineer'],
                  },
                ],
              },
            ],
          },
          {
            type: 'task',
            id: 'task-drawing-review',
            title: 'Drawing Review & Redlines',
            summary: 'SE and Solutions PM review drawings; redlines sent back to CAD Engineer for revision before final approval.',
            details: [
              'Solutions Engineer and Solutions Project Manager review the initial drawing package from the CAD Engineer.',
              'Redlines and revision requests are submitted back for correction.',
              'CAD Engineer revises and resubmits — cycle repeats until drawings are approved.',
              'No cable pull is authorized until the drawing package and pull schedule are finalized.',
              'Final approved drawing package is included in the Engineering Packet.',
            ],
            roles: ['Solutions Engineer', 'Solutions Project Manager', 'CAD Engineer'],
            templates: ['Drawing Review Checklist'],
          },
          {
            type: 'task',
            id: 'task-compile-engineering-packet',
            title: 'Compile & Submit Packet to Hub',
            summary: 'Compile all engineering deliverables into the Engineering Packet and submit.',
            details: [
              'Deliverable: Engineering Packet — signal flow diagrams, rack & field elevations, functional narrative with GUI screenshots, IP scope with hostnames, device credentials, switchport assignments, and pull schedule.',
            ],
            roles: ['Solutions Engineer'],
            templates: ['Engineering Packet'],
          },
        ],
      },
    ],
  },

  // ── Milestone 3: Procurement & Kickoff Prep ─────────────────────────────────
  {
    type: 'milestone',
    id: 'milestone-3',
    number: 3,
    title: 'Procurement & Kickoff Prep',
    children: [
      {
        type: 'task',
        id: 'task-walkthrough',
        title: 'Walkthrough',
        summary: 'Confirm onsite needs: materials, tools, infrastructure, items beyond BOM.',
        details: [
          'Solutions Project Manager (or designated colleague) completes a walkthrough to confirm onsite needs: materials, tools, infrastructure readiness, items beyond BOM.',
          'Runs in parallel with engineering packet creation.',
          'No cable pull until the drawing package and pull schedule are finalized.',
          'If the walkthrough reveals out-of-scope items → see Change Orders.',
        ],
        roles: ['Solutions Project Manager', 'Technician'],
        templates: ['Walkthrough Checklist'],
      },
      {
        type: 'task',
        id: 'task-schedule-resources',
        title: 'Schedule Resources',
        summary: 'Arrange Programmer, rack fab, onsite labor, and Lead Tech assignment.',
        details: [
          'Programmer (internal).',
          'Rack fabrication and equipment staging.',
          'Subcontract onsite labor if internal capacity is insufficient.',
          'Technician / Lead Tech assignment within the regional pool.',
        ],
        roles: ['Solutions Project Manager', 'Programmer', 'Technician'],
      },
      {
        type: 'task',
        id: 'task-partial-release-revisit',
        title: 'Partial Purchasing Release Revisit (if applicable)',
        summary: 'If previously flagged items have clear direction, release remaining procurement.',
        details: [
          'If previously flagged items now have clear direction → release remaining procurement.',
        ],
        roles: ['Solutions Project Manager', 'Procurement'],
      },
      {
        type: 'stage',
        id: 'stage-ep-review',
        title: 'Engineering Packet Review',
        meta: 'Independent validation by Solutions Project Manager before execution begins.',
        children: [
          {
            type: 'decision',
            id: 'decision-adjustments-needed',
            title: 'Adjustments Needed?',
            roles: ['Solutions Project Manager', 'Solutions Engineer', 'CAD Engineer', 'UX Designer'],
            optionA: {
              label: 'YES',
              description:
                'Markup & Resubmit: Solutions Project Manager communicates required revisions to SE → SE coordinates with CAD Engineer / UX Designer → markup and resubmit.',
            },
            optionB: {
              label: 'NO',
              description: 'No adjustments needed — continue.',
            },
          },
        ],
      },
      {
        type: 'stage',
        id: 'stage-pre-install',
        title: 'Pre-Install Preparation',
        children: [
          {
            type: 'task',
            id: 'task-finalize-dates',
            title: 'Finalize Calendar Dates',
            summary: 'Solutions Project Manager finalizes onsite installation dates with the client.',
            details: ['Solutions Project Manager finalizes onsite installation dates with the client.'],
            roles: ['Solutions Project Manager'],
          },
          {
            type: 'task',
            id: 'task-pm-review-procurement',
            title: 'PM Review to Inside PM',
            summary: 'Solutions Project Manager submits routing, SOW, and shipping needs for day-1 logistics setup.',
            details: [
              'Solutions Project Manager submits a review summarizing routing, SOW, and shipping needs (tools, materials, etc.) for day-1 setup.',
              'Inside PM uses this to confirm logistics are in place before the install begins.',
            ],
            roles: ['Solutions Project Manager', 'Inside PM'],
          },
        ],
      },
    ],
  },

  // ── Milestone 4: Implementation ─────────────────────────────────────────────
  {
    type: 'milestone',
    id: 'milestone-4',
    number: 4,
    title: 'Implementation',
    children: [
      // ── Daily Tasks ──
      {
        type: 'task',
        id: 'task-daily-operations',
        title: 'Daily Tasks',
        summary: 'Ongoing field execution, documentation, and logistics throughout the install.',
        details: [],
        roles: ['Solutions Project Manager', 'Admin', 'Technician', 'Inside PM'],
        templates: ['Daily Report'],
        exclusiveGroup: 'onsite-ops',
            children: [
              {
                type: 'task',
                id: 'task-daily-field-pm',
                title: 'Solutions PM',
                summary: 'Field guidance, project notes, and day-over-day coordination.',
                details: [
                  'Provides daily field guidance to technicians, ensuring their needs are met and work progresses per plan.',
                  'Maintains project notes in preferred tracking method (Excel, Gantt, notepad); templated trackers available upon request.',
                  "If the day's required tasks differ from the original plan, an additional PM review is required before proceeding.",
                ],
                roles: ['Solutions Project Manager'],
              },
              {
                type: 'task',
                id: 'task-daily-admin',
                title: 'Admin',
                summary: 'Daily report intake, processing, and stakeholder distribution.',
                details: [
                  'Receives daily reports from the field team.',
                  'Distributes to all relevant stakeholders.',
                  'Flags issues raised in the report to the Solutions Project Manager for follow-up.',
                ],
                roles: ['Admin'],
                templates: ['Daily Report'],
              },
              {
                type: 'task',
                id: 'task-daily-inside-pm',
                title: 'Inside PM',
                summary: 'Routing, shipping requests, and daily logistics confirmed for each day.',
                details: [
                  'Confirms that routing, shipping requests, and supply logistics are in place for each day of the install.',
                  'Coordinates with Procurement and Solutions Project Manager to ensure materials and deliveries stay aligned with the daily schedule.',
                  'Flags any logistical gaps that could delay field progress.',
                ],
                roles: ['Inside PM'],
              },
            ],
          },

          // ── Weekly Tasks ──
          {
            type: 'task',
            id: 'task-weekly-tasks',
            title: 'Weekly Tasks',
            summary: 'Recurring weekly responsibilities across the project team.',
            details: [],
            roles: ['Admin', 'Solutions Project Manager', 'Procurement', 'Inside PM', 'Solutions Executive'],
            templates: ['Weekly Customer Update'],
            exclusiveGroup: 'onsite-ops',
            children: [
              {
                type: 'task',
                id: 'task-weekly-admin',
                title: 'Admin',
                summary: 'Routine weekly customer status update.',
                details: [
                  'Sends the routine weekly status update to the client using the Weekly Customer Update template.',
                  'Solutions Project Manager supplies content; Admin handles formatting and distribution.',
                ],
                roles: ['Admin'],
                templates: ['Weekly Customer Update'],
              },
              {
                type: 'task',
                id: 'task-weekly-field-pm',
                title: 'Solutions PM',
                summary: 'Escalations, non-routine communications, and milestone updates.',
                details: [
                  'Owns all non-routine customer communication, escalations, and technical conversations.',
                  'Keeps the Solutions Executive updated as milestones are reached or significant issues arise.',
                ],
                roles: ['Solutions Project Manager'],
              },
              {
                type: 'task',
                id: 'task-weekly-procurement',
                title: 'Procurement',
                summary: 'RMAs, additional materials, and shipping updates.',
                details: [
                  'Processes RMAs and any return-to-stock items.',
                  'Handles additional material procurement as field needs change.',
                  'Updates shipping ETAs.',
                ],
                roles: ['Procurement'],
              },
              {
                type: 'task',
                id: 'task-weekly-inside-pm',
                title: 'Inside PM',
                summary: 'Financial tracking, logistics review, and variance escalation.',
                details: [
                  'Tracks labor hours, material costs, change order impacts, and margin status.',
                  'Reviews routing, shipping requests, and logistics for the coming week — confirming supply is aligned with the install schedule.',
                  'Flags cost variances and logistical gaps to the Solutions Project Manager early for corrective action.',
                ],
                roles: ['Inside PM'],
              },
            ],
          },

          // ── Issue Tracking ──
          {
            type: 'task',
            id: 'task-issue-tracking',
            title: 'Issue Tracking',
            wideChildren: true,
            summary: 'Issues logged in tracker; never deleted; project cannot close with open issues.',
            details: [
              'Issues added to the Issue Tracker → progress updated as work continues.',
              'Items are never deleted — they may be filtered out, but the record must remain for posterity.',
              'The project is not closed with any open issues.',
              'Solutions Project Manager follows up with the lead and updates the tracker.',
            ],
            roles: ['Solutions Project Manager', 'Technician'],
            templates: ['Issue Tracker'],
            exclusiveGroup: 'onsite-ops',
            children: [
              {
                type: 'decision',
                id: 'decision-item-resolved',
                title: 'Is Item Resolved?',
                roles: ['Solutions Project Manager'],
                optionA: {
                  label: 'YES',
                  description: 'Mark Complete (do not delete the record).',
                },
                optionB: {
                  label: 'NO',
                  description:
                    'Solutions Project Manager determines the next step and assigns the appropriate resource.',
                },
              },
              {
                type: 'decision',
                id: 'decision-change-order-needed',
                title: 'Change Order Needed?',
                roles: ['Solutions Project Manager', 'Solutions Engineer'],
                showWhen: { decisionId: 'decision-item-resolved', option: 'B' },
                optionA: {
                  label: 'NO — Continue',
                  description: 'No change order. Continue the workflow as planned.',
                },
                optionB: {
                  label: 'YES — Raise CO',
                  description: 'A change order is needed.',
                  branch: [
                    {
                      type: 'task',
                      id: 'task-generating-cos',
                      title: 'Generating COs',
                      summary:
                        'Solutions Project Manager opens OPP in ConnectWise; SE prepares the CO (engineering always internal).',
                      details: [
                        'Solutions Project Manager or SE identifies the need (walkthrough findings, customer requests, field conditions, etc.).',
                        'Solutions Project Manager opens an OPP in ConnectWise and submits the request with details.',
                        'CO prepared by SE (engineering work is always internal).',
                      ],
                      roles: ['Solutions Project Manager', 'Solutions Engineer'],
                    },
                    {
                      type: 'decision',
                      id: 'decision-co-site-visit',
                      title: 'Does CO Warrant a Site Visit?',
                      roles: ['Solutions Project Manager'],
                      optionA: {
                        label: 'YES — Substantial',
                        description:
                          'Substantial scope change → schedule a Survey before submitting to customer. Template: Survey — owned by Solutions Project Manager.',
                      },
                      optionB: {
                        label: 'NO',
                        description: 'Walkthrough-level verification sufficient, or not needed.',
                      },
                    },
                    {
                      type: 'task',
                      id: 'task-submit-co',
                      title: 'Submit CO to Customer',
                      summary: 'Solutions Project Manager reviews and submits the CO to the customer for approval.',
                      details: ['Solutions Project Manager reviews and submits the CO to the customer for approval.'],
                      roles: ['Solutions Project Manager'],
                      showWhen: { decisionId: 'decision-co-site-visit', option: 'any' },
                    },
                    {
                      type: 'task',
                      id: 'task-process-executed-co',
                      title: 'Process Executed CO',
                      summary: 'After customer approval, SE updates affected Engineering Packet documents.',
                      details: [
                        'After customer approval, SE updates affected Engineering Packet documents (functional narrative, drawings, IP scope).',
                        'Updated deliverables are included in the Closeout Packet — not separately submitted to the customer.',
                      ],
                      roles: ['Solutions Engineer'],
                      showWhen: { decisionId: 'decision-co-site-visit', option: 'any' },
                    },
                  ],
                },
              },
            ],
          },
    ],
  },

  // ── Milestone 5: Commissioning & Handoff ────────────────────────────────────
  {
    type: 'milestone',
    id: 'milestone-5',
    number: 5,
    title: 'Commissioning & Handoff',
    children: [
      {
        type: 'task',
        id: 'task-commissioning',
        title: 'Commissioning',
        summary:
          'Use Functional Narrative as checklist; Solutions Project Manager captures as-built info for SE.',
        details: [
          'Owned by Solutions Project Manager, with SE supporting as needed.',
          'Use the Functional Narrative as the commissioning checklist — verify each function performs as described.',
          'Solutions Project Manager gathers as-built information (text, email, red lines) and delivers to SE for as-built finalization.',
          'Updated IP scope with all device credentials verified and recorded.',
          'Red lines or notes on any deviations from drawings.',
          'The individual performing commissioning may vary, but Solutions Project Manager is responsible for capturing and routing the information.',
        ],
        roles: ['Solutions Project Manager', 'Solutions Engineer'],
      },
      {
        type: 'decision',
        id: 'decision-functional-changes',
        title: 'Functional Changes Requested?',
        roles: ['Solutions Project Manager'],
        optionA: {
          label: 'NO',
          description: 'No functional changes — continue to training.',
        },
        optionB: {
          label: 'YES',
          description: 'Functional changes requested.',
          branch: [
            {
              type: 'task',
              id: 'task-pm-reviews-coordinates',
              title: 'Solutions PM Reviews & Coordinates',
              summary: 'Solutions PM reviews the requested changes and coordinates the work.',
              details: ['Solutions PM reviews the requested changes and coordinates the work.'],
              roles: ['Solutions Project Manager'],
            },
            {
              type: 'decision',
              id: 'decision-is-co',
              title: 'Is This a Change Order?',
              roles: ['Solutions Project Manager'],
              context:
                'Minor programming updates (sound levels, fader ranges, visual feedback) — no cost within the 3-month labor warranty period. Changes that alter documented functionality may require a change order.',
              optionA: {
                label: 'YES',
                description: 'Open OPP → see the Change Order process.',
              },
              optionB: {
                label: 'NO',
                description:
                  'Direct the Project Team: Solutions Project Manager communicates further direction to the project team.',
              },
            },
            {
              type: 'task',
              id: 'task-review-changes-customer',
              title: 'Review Changes with Customer',
              summary: 'Once complete, Solutions Project Manager reviews the changes with the customer.',
              details: ['Once complete, Solutions Project Manager reviews the changes with the customer.'],
              roles: ['Solutions Project Manager'],
            },
          ],
        },
      },
      {
        type: 'task',
        id: 'task-training',
        title: 'Training',
        summary: 'Solutions Project Manager ensures onsite staff training; Admin assists with large group scheduling.',
        details: [
          'Solutions Project Manager ensures onsite staff training is conducted if required.',
          'Admin assists with scheduling if large staff training is requested.',
        ],
        roles: ['Solutions Project Manager', 'Admin'],
      },
      {
        type: 'task',
        id: 'task-final-day-docs',
        title: 'Final Day Documentation',
        summary: 'Photos taken on final day; Lessons Learned reported to regional leadership.',
        details: [
          'Solutions Project Manager ensures photos are taken on the final day — a record of site conditions at handoff.',
          'Lessons Learned → reported to regional leadership for entry into the shared knowledge base.',
          'Engineering errors discovered during the project lifecycle → tracked via an Engineering Issues Ticket in ConnectWise.',
        ],
        roles: ['Solutions Project Manager'],
      },
    ],
  },

  // ── Milestone 6: Closeout ────────────────────────────────────────────────────
  {
    type: 'milestone',
    id: 'milestone-6',
    number: 6,
    title: 'Closeout',
    children: [
      {
        type: 'task',
        id: 'task-field-pm-closeout',
        title: 'Solutions Project Manager Responsibilities',
        summary: 'Communicate completion, compile Closeout Packet, and upload to Teams.',
        details: [
          'Communicate to Inside PM when the project is 100% complete.',
          'Compile the Closeout Packet: all executed proposals and change orders, as-built drawings, final functional narrative, final IP scope with all device credentials, final programming files, Warranty Summary.',
          'User Manual (if customer requests) — compiled from as-built GUI screenshots + latest functional narrative.',
          'Submit the Closeout Packet to the customer.',
          'Compress (zip) and upload to Teams; final programming versions uploaded as individual files, labeled with date of work.',
        ],
        roles: ['Solutions Project Manager'],
        templates: ['Closeout Packet'],
      },
      {
        type: 'task',
        id: 'task-procurement-closeout',
        title: 'Procurement Responsibilities',
        summary: 'Ensure all RMAs / return-to-stock processed.',
        details: ['Ensure all RMAs / return-to-stock processed.'],
        roles: ['Procurement'],
      },
      {
        type: 'task',
        id: 'task-accountant-closeout',
        title: 'Inside PM Responsibilities',
        summary: 'Confirm financials closed, run P&L review, update Solutions Executive on project completion.',
        details: [
          'Ensure all RMAs / return-to-stock processed (validation in coordination with Procurement).',
          'Confirm project financials are closed.',
          'Run the P&L Review — actionable retrospective intel on labor, costs, change impact, and margin.',
          'Update the Solutions Executive that the project is complete.',
          'The functional narrative can serve as a manual and mitigate unnecessary service calls.',
        ],
        roles: ['Inside PM', 'Procurement', 'Solutions Executive'],
      },
    ],
  },

  // ── Milestone 7: Project Complete ────────────────────────────────────────────
  {
    type: 'milestone',
    id: 'milestone-7',
    number: 7,
    title: 'Project Complete',
    children: [],
  },
];
