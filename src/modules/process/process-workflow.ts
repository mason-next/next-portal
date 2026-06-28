// ─── Types ───────────────────────────────────────────────────────────────────

export type Role =
  | 'Field PM'
  | 'Project Engineer'
  | 'Inside PM'
  | 'Procurement'
  | 'Admin'
  | 'Technician'
  | 'Programmer'
  | 'UX Designer'
  | 'Sales Rep'
  | 'Pre-Sales Engineer'
  | 'CAD Engineer';

export const ALL_ROLES: Role[] = [
  'Field PM',
  'Project Engineer',
  'Inside PM',
  'Procurement',
  'Admin',
  'Technician',
  'Programmer',
  'UX Designer',
  'Sales Rep',
  'Pre-Sales Engineer',
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
  if (node.type === 'milestone') return `Milestone ${node.number}: ${node.title}`;
  if (node.type === 'parallel') return node.description;
  return node.title;
}

export function getNodeRoles(node: WorkflowNode): Role[] {
  if (node.type === 'task' || node.type === 'decision') return node.roles;
  return [];
}

// ─── Workflow Data ────────────────────────────────────────────────────────────

export const WORKFLOW: MilestoneNode[] = [
  // ── Milestone 1: Project Won ────────────────────────────────────────────────
  {
    type: 'milestone',
    id: 'milestone-1',
    number: 1,
    title: 'Project Won',
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
                      'Prepare for the internal kickoff: identify questions and background to gather from the Pre-Sales Engineer.',
                    ],
                    roles: ['Project Engineer'],
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
                      'Initial Project Schedule generated, adjusted in real time by Field PM.',
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
        roles: ['Field PM', 'Project Engineer', 'Inside PM', 'Procurement', 'Admin', 'Sales Rep'],
        children: [
          {
            type: 'task',
            id: 'task-internal-kickoff',
            title: 'Internal Kickoff',
            isCall: true,
            summary:
              'Within 48h of PO — Attendees: Field PM, PE, Inside PM, Procurement, Sales Rep, Admin (optional).',
            details: [
              'Review project scope and customer expectations.',
              'Consult with Pre-Sales Engineer to understand design intentions and project background.',
              'Identify additional specialists needed: Programmer, UX Designer, CAD, Rack Fab, Commissioning support, or subcontractors.',
              'Confirm auto-assigned resources; flag capacity concerns for escalation.',
              'Confirm timeline targets and major milestones.',
              'Procurement flags long-lead items immediately.',
            ],
            roles: ['Field PM', 'Project Engineer', 'Inside PM', 'Procurement', 'Sales Rep', 'Admin'],
            templates: ['Internal Kickoff Agenda'],
          },
          {
            type: 'task',
            id: 'task-customer-kickoff',
            title: 'Customer Kickoff',
            isCall: true,
            summary: 'Owned by Field PM. Held just after the internal kickoff.',
            details: [
              'Introduce the assigned team, review project scope, and establish expectations on timeline and methodology.',
              'Frame customer expectations: large-scale deployments require time to prepare leading up to installation.',
            ],
            roles: ['Field PM', 'Sales Rep'],
          },
        ],
      },
      {
        type: 'stage',
        id: 'stage-bom-review',
        title: 'BOM Review',
        meta: 'Owned by Project Engineer. Review the BOM for accuracy, completeness, and alignment with design intent.',
        children: [
          {
            type: 'task',
            id: 'task-finishes-approval',
            title: 'Capture Finishes Approval',
            summary: 'Written customer approval for color and finishes of all relevant materials.',
            details: [
              'Written customer approval (email sufficient) confirming color and finishes of all relevant materials.',
              'Deliverable: Finishes Approval on file.',
            ],
            roles: ['Project Engineer'],
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
            roles: ['Project Engineer'],
          },
          {
            type: 'decision',
            id: 'decision-purchasing-release',
            title: 'Full or Partial Purchasing Release?',
            roles: ['Project Engineer', 'Procurement'],
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
            title: 'PE Communicates: Clear for Purchasing',
            summary: 'PE signals Procurement Coordinator to proceed with purchasing.',
            details: ['PE communicates to the Procurement Coordinator: Clear for Purchasing.'],
            roles: ['Project Engineer', 'Procurement'],
          },
        ],
      },
    ],
  },

  // ── Milestone 2: BOM Review Complete ────────────────────────────────────────
  {
    type: 'milestone',
    id: 'milestone-2',
    number: 2,
    title: 'BOM Review Complete',
    children: [
      {
        type: 'stage',
        id: 'stage-engineering-packet',
        title: 'Create Engineering Packet',
        meta: 'Owned by Project Engineer. PE may pull in CAD Engineer, Programmer, and UX Designer as needed.',
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
                    roles: ['Project Engineer', 'Programmer'],
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
                    roles: ['UX Designer', 'Project Engineer', 'Programmer'],
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
                    roles: ['Programmer', 'Project Engineer'],
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
                    roles: ['Project Engineer'],
                    templates: ['IP Scope'],
                  },
                  {
                    type: 'task',
                    id: 'task-drawings',
                    title: 'Drawings',
                    summary:
                      'CAD Engineer produces rack and field elevations; PE coordinates multi-project balancing.',
                    details: [
                      'PE submits to CAD Engineer.',
                      'Draft sketch if none existing; if a sketch exists, add detail and include switchport assignments.',
                      'PE coordinates when multi-project CAD workloads need balancing.',
                      'Final drawings include both rack and field elevations.',
                    ],
                    roles: ['CAD Engineer', 'Project Engineer'],
                  },
                  {
                    type: 'task',
                    id: 'task-pull-schedule',
                    title: 'Pull Schedule',
                    summary: 'Requested from CAD Engineer if needed.',
                    details: ['Requested from CAD Engineer if needed.'],
                    roles: ['CAD Engineer', 'Project Engineer'],
                  },
                ],
              },
            ],
          },
          {
            type: 'task',
            id: 'task-compile-engineering-packet',
            title: 'Compile & Submit Packet to Hub',
            summary: 'Compile all engineering deliverables into the Engineering Packet and submit.',
            details: [
              'Deliverable: Engineering Packet — signal flow diagrams, rack & field elevations, functional narrative with GUI screenshots, IP scope with hostnames, device credentials, switchport assignments, and pull schedule.',
            ],
            roles: ['Project Engineer'],
            templates: ['Engineering Packet'],
          },
        ],
      },
      {
        type: 'task',
        id: 'task-walkthrough',
        title: 'Walkthrough',
        summary: 'Confirm onsite needs: materials, tools, infrastructure, items beyond BOM.',
        details: [
          'Field PM (or designated colleague) completes a walkthrough to confirm onsite needs: materials, tools, infrastructure readiness, items beyond BOM.',
          'Runs in parallel with engineering packet creation.',
          'No cable pull until the drawing package and pull schedule are finalized.',
          'If the walkthrough reveals out-of-scope items → see Change Orders.',
        ],
        roles: ['Field PM', 'Technician'],
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
        roles: ['Field PM', 'Programmer', 'Technician'],
      },
    ],
  },

  // ── Milestone 3: Engineering Packet Submitted ────────────────────────────────
  {
    type: 'milestone',
    id: 'milestone-3',
    number: 3,
    title: 'Engineering Packet Submitted',
    children: [
      {
        type: 'task',
        id: 'task-partial-release-revisit',
        title: 'Partial Purchasing Release Revisit (if applicable)',
        summary: 'If previously flagged items have clear direction, release remaining procurement.',
        details: [
          'If previously flagged items now have clear direction → release remaining procurement.',
        ],
        roles: ['Field PM', 'Procurement'],
      },
      {
        type: 'stage',
        id: 'stage-ep-review',
        title: 'Engineering Packet Review',
        meta: 'Independent validation by Field PM before execution begins.',
        children: [
          {
            type: 'decision',
            id: 'decision-adjustments-needed',
            title: 'Adjustments Needed?',
            roles: ['Field PM', 'Project Engineer', 'CAD Engineer', 'UX Designer'],
            optionA: {
              label: 'YES',
              description:
                'Markup & Resubmit: Field PM communicates required revisions to PE → PE coordinates with CAD Engineer / UX Designer → markup and resubmit.',
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
            summary: 'Field PM finalizes onsite installation dates with the client.',
            details: ['Field PM finalizes onsite installation dates with the client.'],
            roles: ['Field PM'],
          },
          {
            type: 'task',
            id: 'task-pm-review-procurement',
            title: 'PM Review to Procurement',
            summary: 'Field PM submits routing, SOW, and shipping needs for day-1 setup.',
            details: [
              'Field PM submits a review summarizing routing, SOW, and shipping needs (tools, materials, etc.) for day-1 setup.',
            ],
            roles: ['Field PM', 'Procurement'],
          },
        ],
      },
    ],
  },

  // ── Milestone 4: Onsite Install Begins ──────────────────────────────────────
  {
    type: 'milestone',
    id: 'milestone-4',
    number: 4,
    title: 'Onsite Install Begins',
    children: [
      // ── Daily Tasks ──
      {
        type: 'task',
        id: 'task-daily-operations',
        title: 'Daily Tasks',
        summary: 'Ongoing field execution, documentation, and logistics throughout the install.',
        details: [],
        roles: ['Field PM', 'Admin', 'Procurement', 'Technician', 'Inside PM'],
        templates: ['Daily Report'],
        exclusiveGroup: 'onsite-ops',
            children: [
              {
                type: 'task',
                id: 'task-daily-field-pm',
                title: 'Field PM',
                summary: 'Field guidance, project notes, and day-over-day coordination.',
                details: [
                  'Provides daily field guidance to technicians, ensuring their needs are met and work progresses per plan.',
                  'Maintains project notes in preferred tracking method (Excel, Gantt, notepad); templated trackers available upon request.',
                  "If the day's required tasks differ from the original plan, an additional PM review is required before proceeding.",
                ],
                roles: ['Field PM'],
              },
              {
                type: 'task',
                id: 'task-daily-admin',
                title: 'Admin',
                summary: 'Daily report intake, processing, and stakeholder distribution.',
                details: [
                  'Receives daily reports from the field team.',
                  'Distributes to all relevant stakeholders.',
                  'Flags issues raised in the report to the Field PM for follow-up.',
                ],
                roles: ['Admin'],
                templates: ['Daily Report'],
              },
              {
                type: 'task',
                id: 'task-daily-procurement',
                title: 'Procurement',
                summary: 'Next-day materials and logistics coordination.',
                details: [
                  'Reviews field needs for the following day and ensures materials, tools, and shipments are coordinated.',
                  'Ensures next-day logistical requirements are met onsite without delays.',
                ],
                roles: ['Procurement'],
              },
              {
                type: 'task',
                id: 'task-daily-inside-pm',
                title: 'Inside PM',
                summary: 'Routing, shipping requests, and daily logistics confirmed for each day.',
                details: [
                  'Confirms that routing, shipping requests, and supply logistics are in place for each day of the install.',
                  'Coordinates with Procurement and Field PM to ensure materials and deliveries stay aligned with the daily schedule.',
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
            roles: ['Admin', 'Field PM', 'Procurement', 'Inside PM', 'Sales Rep'],
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
                  'Field PM supplies content; Admin handles formatting and distribution.',
                ],
                roles: ['Admin'],
                templates: ['Weekly Customer Update'],
              },
              {
                type: 'task',
                id: 'task-weekly-field-pm',
                title: 'Field PM',
                summary: 'Escalations, non-routine communications, and milestone updates.',
                details: [
                  'Owns all non-routine customer communication, escalations, and technical conversations.',
                  'Keeps the Sales Rep updated as milestones are reached or significant issues arise.',
                ],
                roles: ['Field PM'],
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
                  'Flags cost variances and logistical gaps to the Field PM early for corrective action.',
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
            summary: 'Issues logged in tracker; never deleted; project cannot close with open issues.',
            details: [
              'Issues added to the Issue Tracker → progress updated as work continues.',
              'Items are never deleted — they may be filtered out, but the record must remain for posterity.',
              'The project is not closed with any open issues.',
              'Field PM follows up with the lead and updates the tracker.',
            ],
            roles: ['Field PM', 'Technician'],
            templates: ['Issue Tracker'],
            exclusiveGroup: 'onsite-ops',
            children: [
              {
                type: 'decision',
                id: 'decision-item-resolved',
                title: 'Is Item Resolved?',
                roles: ['Field PM'],
                optionA: {
                  label: 'YES',
                  description: 'Mark Complete (do not delete the record).',
                },
                optionB: {
                  label: 'NO',
                  description:
                    'Field PM determines the next step and assigns the appropriate resource.',
                },
              },
              {
                type: 'decision',
                id: 'decision-change-order-needed',
                title: 'Change Order Needed?',
                roles: ['Field PM', 'Project Engineer'],
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
                        'Field PM opens OPP in ConnectWise; PE prepares the CO (engineering always internal).',
                      details: [
                        'Field PM or PE identifies the need (walkthrough findings, customer requests, field conditions, etc.).',
                        'Field PM opens an OPP in ConnectWise and submits the request with details.',
                        'CO prepared by PE (engineering work is always internal).',
                      ],
                      roles: ['Field PM', 'Project Engineer'],
                    },
                    {
                      type: 'decision',
                      id: 'decision-co-site-visit',
                      title: 'Does CO Warrant a Site Visit?',
                      roles: ['Field PM'],
                      optionA: {
                        label: 'YES — Substantial',
                        description:
                          'Substantial scope change → schedule a Survey before submitting to customer. Template: Survey — owned by Field PM.',
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
                      summary: 'Field PM reviews and submits the CO to the customer for approval.',
                      details: ['Field PM reviews and submits the CO to the customer for approval.'],
                      roles: ['Field PM'],
                      showWhen: { decisionId: 'decision-co-site-visit', option: 'any' },
                    },
                    {
                      type: 'task',
                      id: 'task-process-executed-co',
                      title: 'Process Executed CO',
                      summary: 'After customer approval, PE updates affected Engineering Packet documents.',
                      details: [
                        'After customer approval, PE updates affected Engineering Packet documents (functional narrative, drawings, IP scope).',
                        'Updated deliverables are included in the Closeout Packet — not separately submitted to the customer.',
                      ],
                      roles: ['Project Engineer'],
                      showWhen: { decisionId: 'decision-co-site-visit', option: 'any' },
                    },
                  ],
                },
              },
            ],
          },
    ],
  },

  // ── Milestone 5: Commissioning and Handoff ───────────────────────────────────
  {
    type: 'milestone',
    id: 'milestone-5',
    number: 5,
    title: 'Commissioning and Handoff',
    children: [
      {
        type: 'stage',
        id: 'stage-commissioning',
        title: 'Commissioning',
        meta: 'Owned by Field PM, with PE supporting as needed.',
        children: [
          {
            type: 'task',
            id: 'task-commissioning',
            title: 'Commissioning',
            summary:
              'Use Functional Narrative as checklist; Field PM captures as-built info for PE.',
            details: [
              'Use the Functional Narrative as the commissioning checklist — verify each function performs as described.',
              'Field PM gathers as-built information (text, email, red lines) and delivers to PE for as-built finalization.',
              'Updated IP scope with all device credentials verified and recorded.',
              'Red lines or notes on any deviations from drawings.',
              'The individual performing commissioning may vary, but Field PM is responsible for capturing and routing the information.',
            ],
            roles: ['Field PM', 'Project Engineer'],
          },
          {
            type: 'decision',
            id: 'decision-functional-changes',
            title: 'Functional Changes Requested?',
            roles: ['Field PM'],
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
                  title: 'Field PM Reviews & Coordinates',
                  summary: 'Field PM reviews the requested changes and coordinates the work.',
                  details: ['Field PM reviews the requested changes and coordinates the work.'],
                  roles: ['Field PM'],
                },
                {
                  type: 'decision',
                  id: 'decision-is-co',
                  title: 'Is This a Change Order?',
                  roles: ['Field PM'],
                  context:
                    'Minor programming updates (sound levels, fader ranges, visual feedback) — no cost within the 3-month labor warranty period. Changes that alter documented functionality may require a change order.',
                  optionA: {
                    label: 'YES',
                    description: 'Open OPP → see the Change Order process.',
                  },
                  optionB: {
                    label: 'NO',
                    description:
                      'Direct the Project Team: Field PM communicates further direction to the project team.',
                  },
                },
                {
                  type: 'task',
                  id: 'task-review-changes-customer',
                  title: 'Review Changes with Customer',
                  summary: 'Once complete, Field PM reviews the changes with the customer.',
                  details: ['Once complete, Field PM reviews the changes with the customer.'],
                  roles: ['Field PM'],
                },
              ],
            },
          },
          {
            type: 'task',
            id: 'task-training',
            title: 'Training',
            summary: 'Field PM ensures onsite staff training; Admin assists with large group scheduling.',
            details: [
              'Field PM ensures onsite staff training is conducted if required.',
              'Admin assists with scheduling if large staff training is requested.',
            ],
            roles: ['Field PM', 'Admin'],
          },
          {
            type: 'task',
            id: 'task-final-day-docs',
            title: 'Final Day Documentation',
            summary: 'Photos taken on final day; Lessons Learned reported to regional leadership.',
            details: [
              'Field PM ensures photos are taken on the final day — a record of site conditions at handoff.',
              'Lessons Learned → reported to regional leadership for entry into the shared knowledge base.',
              'Engineering errors discovered during the project lifecycle → tracked via an Engineering Issues Ticket in ConnectWise.',
            ],
            roles: ['Field PM'],
          },
        ],
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
        title: 'Field PM Responsibilities',
        summary: 'Communicate completion, compile Closeout Packet, and upload to Teams.',
        details: [
          'Communicate to Inside PM when the project is 100% complete.',
          'Compile the Closeout Packet: all executed proposals and change orders, as-built drawings, final functional narrative, final IP scope with all device credentials, final programming files, Warranty Summary.',
          'User Manual (if customer requests) — compiled from as-built GUI screenshots + latest functional narrative.',
          'Submit the Closeout Packet to the customer.',
          'Compress (zip) and upload to Teams; final programming versions uploaded as individual files, labeled with date of work.',
        ],
        roles: ['Field PM'],
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
        summary: 'Confirm financials closed, run P&L review, update Sales Rep on project completion.',
        details: [
          'Ensure all RMAs / return-to-stock processed (validation in coordination with Procurement).',
          'Confirm project financials are closed.',
          'Run the P&L Review — actionable retrospective intel on labor, costs, change impact, and margin.',
          'Update the Sales Rep that the project is complete.',
          'The functional narrative can serve as a manual and mitigate unnecessary service calls.',
        ],
        roles: ['Inside PM', 'Procurement', 'Sales Rep'],
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
