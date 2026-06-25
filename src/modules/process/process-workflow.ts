// ─── Types ───────────────────────────────────────────────────────────────────

export type Role =
  | 'Field PM'
  | 'Project Engineer'
  | 'Inside PM / Accountant'
  | 'Procurement / Logistics'
  | 'Admin'
  | 'Technician/Lead Tech'
  | 'Programmer'
  | 'UX Designer'
  | 'Sales Rep'
  | 'Pre-Sales Engineer'
  | 'Leadership'
  | 'CAD Sub'
  | 'Programming Sub'
  | 'Labor Sub';

export const ALL_ROLES: Role[] = [
  'Field PM',
  'Project Engineer',
  'Inside PM / Accountant',
  'Procurement / Logistics',
  'Admin',
  'Technician/Lead Tech',
  'Programmer',
  'UX Designer',
  'Sales Rep',
  'Pre-Sales Engineer',
  'Leadership',
  'CAD Sub',
  'Programming Sub',
  'Labor Sub',
];

export interface MilestoneNode {
  type: 'milestone';
  id: string;
  number: number;
  title: string;
}

export interface StageNode {
  type: 'stage';
  id: string;
  title: string;
  meta?: string;
}

export interface TaskNode {
  type: 'task';
  id: string;
  title: string;
  summary: string;
  details: string[];
  roles: Role[];
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

export function flattenWorkflow(nodes: WorkflowNode[]): WorkflowNode[] {
  const result: WorkflowNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.type === 'parallel') {
      for (const lane of node.lanes) {
        result.push(...flattenWorkflow(lane.nodes));
      }
    } else if (node.type === 'decision') {
      if (node.optionA.branch?.length) result.push(...flattenWorkflow(node.optionA.branch));
      if (node.optionB.branch?.length) result.push(...flattenWorkflow(node.optionB.branch));
    }
  }
  return result;
}

export function groupByMilestone(
  workflow: WorkflowNode[],
): Array<{ milestone?: MilestoneNode; items: WorkflowNode[] }> {
  const groups: Array<{ milestone?: MilestoneNode; items: WorkflowNode[] }> = [];
  let current: { milestone?: MilestoneNode; items: WorkflowNode[] } = { items: [] };
  for (const node of workflow) {
    if (node.type === 'milestone') {
      if (current.items.length > 0 || current.milestone) groups.push(current);
      current = { milestone: node, items: [] };
    } else {
      current.items.push(node);
    }
  }
  if (current.items.length > 0 || current.milestone) groups.push(current);
  return groups;
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

export const WORKFLOW: WorkflowNode[] = [
  { type: 'milestone', id: 'milestone-1', number: 1, title: 'Project Won' },
  {
    type: 'task',
    id: 'task-project-opened',
    title: 'Project Opened in ConnectWise',
    summary: 'Triggers automatic notifications and role assignments.',
    details: [
      'ConnectWise opens the project record → triggers automatic notifications and role assignments.',
    ],
    roles: ['Field PM', 'Project Engineer', 'Admin'],
  },
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
            roles: ['Project Engineer', 'Field PM', 'Pre-Sales Engineer'],
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
              "Welcome Letter dispatched to customer — project team and Sales Rep CC'd. (Template: Welcome Letter — Admin.)",
              'Initial Project Schedule generated. (Template: Project Schedule — Admin, adjusted in real time by Field PM.)',
            ],
            roles: ['Admin', 'Sales Rep'],
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
              'Procurement / Logistics engaged at PO.',
              'Long-lead items surfaced ahead of the Internal Kickoff for immediate flagging.',
            ],
            roles: ['Procurement / Logistics'],
          },
        ],
      },
    ],
  },
  {
    type: 'stage',
    id: 'stage-internal-kickoff',
    title: 'Internal Kickoff',
    meta: 'Within 48h of PO — does not wait for engineering. Attendees: Field PM, Project Engineer, Inside PM / Accountant, Procurement / Logistics, Sales Rep, Admin (optional).',
  },
  {
    type: 'task',
    id: 'task-internal-kickoff-agenda',
    title: 'Internal Kickoff Agenda',
    summary: 'Review scope, confirm resources, flag capacity concerns, set timeline.',
    details: [
      'Review project scope and customer expectations.',
      'Consult with Pre-Sales Engineer to understand design intentions and project background.',
      'Identify additional specialists needed: Programmer, UX Designer, CAD, Rack Fab, Commissioning support, or Labor Subs.',
      'Confirm auto-assigned resources; flag capacity concerns for escalation.',
      'Confirm timeline targets and major milestones.',
      'Procurement Coordinator flags long-lead items immediately.',
      'Template: Internal Kickoff Agenda — owned by Field PM.',
    ],
    roles: ['Field PM', 'Project Engineer', 'Inside PM / Accountant', 'Procurement / Logistics', 'Sales Rep', 'Admin'],
  },
  {
    type: 'stage',
    id: 'stage-customer-kickoff',
    title: 'Customer Kickoff',
    meta: 'Owned by Field PM. Held just after the internal kickoff.',
  },
  {
    type: 'task',
    id: 'task-customer-kickoff',
    title: 'Customer Kickoff Call',
    summary: 'Introduce team, review scope, and establish expectations on timeline.',
    details: [
      'Introduce the assigned team, review project scope, and establish expectations on timeline and methodology.',
      'Frame customer expectations: large-scale deployments require time to prepare leading up to installation.',
    ],
    roles: ['Field PM', 'Sales Rep'],
  },
  {
    type: 'stage',
    id: 'stage-bom-review',
    title: 'BOM Review',
    meta: 'Owned by Project Engineer. Review the BOM for accuracy, completeness, and alignment with design intent.',
  },
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
    roles: ['Project Engineer', 'Procurement / Logistics'],
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
    summary: 'PE signals Procurement / Logistics Coordinator to proceed with purchasing.',
    details: ['PE communicates to the Procurement / Logistics Coordinator: Clear for Purchasing.'],
    roles: ['Project Engineer', 'Procurement / Logistics'],
  },
  { type: 'milestone', id: 'milestone-2', number: 2, title: 'BOM Review Complete' },
  {
    type: 'stage',
    id: 'stage-engineering-packet',
    title: 'Engineering Packet',
    meta: 'Owned by Project Engineer. PE may pull in CAD Sub, Programmer, and UX Designer as needed.',
  },
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
  },
  {
    type: 'parallel',
    id: 'parallel-engineering-tracks',
    description: 'Engineering, site validation, and resourcing in parallel',
    lanes: [
      {
        name: 'Programming Track',
        nodes: [
          {
            type: 'task',
            id: 'task-functional-narrative',
            title: 'Functional Narrative',
            summary: 'System capabilities, workflows, and UX expectations — completed before programming.',
            details: [
              'Write the functional narrative — system capabilities, customer workflows, expected user experience, interface behavior, and operational expectations.',
              'An engineering deliverable completed before programming begins.',
              'Template: Functional Narrative — owned by PE.',
            ],
            roles: ['Project Engineer'],
          },
          {
            type: 'task',
            id: 'task-ux-design-review',
            title: 'UX Design Review',
            summary: 'If needed, for larger projects',
            details: [
              'Conducted before programming begins.',
              'Customer workflow discussions.',
              'Interface expectations review.',
              'GUI consistency across spaces.',
              'Human-centered design pass.',
              'Required for projects with 10+ user interfaces or where consistency across spaces is critical.',
              'Template: Customer GUI Review — owned by UX Designer. Deliverable: Approved UX direction for programming.',
            ],
            roles: ['UX Designer', 'Project Engineer'],
          },
          {
            type: 'task',
            id: 'task-programming-mockups',
            title: 'Programming Mockups',
            summary: 'GUI mockups based on approved UX direction; incorporated into Functional Narrative.',
            details: [
              'After UX approval, Programmer executes GUI mockups based on the approved UX direction.',
              'Incorporate GUI screenshots into the Functional Narrative.',
            ],
            roles: ['Programmer', 'Project Engineer'],
          },
        ],
      },
      {
        name: 'Drawings Track (CAD)',
        nodes: [
          {
            type: 'task',
            id: 'task-drawings',
            title: 'Drawings',
            summary: 'CAD Sub produces rack and field elevations; PE coordinates multi-project balancing.',
            details: [
              'PE submits to CAD Sub ($40/hr).',
              'Draft sketch if none existing; if a sketch exists, add detail and include switchport assignments.',
              'PE coordinates with Central Ops leadership when multi-project CAD workloads need balancing.',
              'Final drawings include both rack and field elevations.',
            ],
            roles: ['CAD Sub', 'Project Engineer', 'Leadership'],
          },
          {
            type: 'task',
            id: 'task-pull-schedule',
            title: 'Pull Schedule',
            summary: 'Requested from CAD Sub if needed.',
            details: ['Requested from CAD Sub if needed.'],
            roles: ['CAD Sub', 'Project Engineer'],
          },
        ],
      },
      {
        name: 'Site Validation',
        nodes: [
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
              'Template: Walkthrough Checklist — owned by Field PM.',
            ],
            roles: ['Field PM', 'Technician/Lead Tech'],
          },
        ],
      },
      {
        name: 'Resourcing',
        nodes: [
          {
            type: 'task',
            id: 'task-schedule-resources',
            title: 'Schedule Resources',
            summary: 'Arrange Programmer, rack fab, onsite Labor Subs, and Lead Tech assignment.',
            details: [
              'Programmer (internal).',
              'Rack fabrication and equipment staging.',
              'Onsite Labor Subs ($65/hr) if internal capacity is insufficient.',
              'Technician / Lead Tech assignment within the regional pool.',
            ],
            roles: ['Field PM', 'Programmer', 'Labor Sub', 'Technician/Lead Tech'],
          },
        ],
      },
    ],
  },
  {
    type: 'task',
    id: 'task-compile-engineering-packet',
    title: 'Compile & Submit Engineering Packet',
    summary: 'Compile all engineering deliverables into the Engineering Packet and submit.',
    details: [
      'Deliverable: Engineering Packet — signal flow diagrams, rack & field elevations, functional narrative with GUI screenshots, IP scope with hostnames, device credentials, switchport assignments, and pull schedule.',
      'Template: Engineering Packet — owned by PE.',
    ],
    roles: ['Project Engineer'],
  },
  { type: 'milestone', id: 'milestone-3', number: 3, title: 'Engineering Packet Submitted' },
  {
    type: 'task',
    id: 'task-partial-release-revisit',
    title: 'Partial Purchasing Release Revisit (if applicable)',
    summary: 'If previously flagged items have clear direction, release remaining procurement.',
    details: ['If previously flagged items now have clear direction → release remaining procurement.'],
    roles: ['Field PM', 'Procurement / Logistics'],
  },
  {
    type: 'stage',
    id: 'stage-ep-review',
    title: 'Engineering Packet Review',
    meta: 'Independent validation by Field PM before execution begins.',
  },
  {
    type: 'decision',
    id: 'decision-adjustments-needed',
    title: 'Adjustments Needed?',
    roles: ['Field PM', 'Project Engineer', 'CAD Sub', 'UX Designer'],
    optionA: {
      label: 'YES',
      description:
        'Markup & Resubmit: Field PM communicates required revisions to PE → PE coordinates with engineer / CAD Sub / UX Designer → markup and resubmit.',
    },
    optionB: {
      label: 'NO',
      description: 'No adjustments needed — continue.',
    },
  },
  { type: 'stage', id: 'stage-pre-install', title: 'Pre-Install Preparation' },
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
    title: 'PM Review to Procurement / Logistics',
    summary: 'Field PM submits routing, SOW, and shipping needs for day-1 setup.',
    details: [
      'Field PM submits a review summarizing routing, SOW, and shipping needs (tools, materials, etc.) for day-1 setup.',
    ],
    roles: ['Field PM', 'Procurement / Logistics'],
  },
  { type: 'milestone', id: 'milestone-4', number: 4, title: 'Onsite Install Begins' },
  { type: 'stage', id: 'stage-onsite-install', title: 'Onsite Install' },
  {
    type: 'parallel',
    id: 'parallel-install-ops',
    description: 'Ongoing install operations (concurrent)',
    lanes: [
      {
        name: 'Daily Ops',
        nodes: [
          {
            type: 'task',
            id: 'task-daily-operations',
            title: 'Daily Operations',
            summary: 'Field PM guides field, Admin processes daily reports, Procurement handles next-day logistics.',
            details: [
              'Field PM — daily field guidance to technicians, ensuring needs are met.',
              'Admin — receives daily reports from the field team, distributes to stakeholders, flags issues to Field PM.',
              'Procurement / Logistics — ensures next-day logistical needs are met onsite.',
              "Should the day's required tasks differ from the original plan, an additional PM review is required.",
              'Template: Daily Report — owned by Lead Tech, processed by Admin.',
            ],
            roles: ['Field PM', 'Admin', 'Procurement / Logistics', 'Technician/Lead Tech'],
          },
        ],
      },
      {
        name: 'Issue Tracking',
        nodes: [
          {
            type: 'task',
            id: 'task-issue-tracking',
            title: 'Issue Tracking (also Punch List)',
            summary: 'Issues logged in ConnectWise; never deleted; project cannot close with open issues.',
            details: [
              'Issues logged in ConnectWise → progress updated as work continues.',
              'Items are never deleted — they may be filtered out, but the record must remain for posterity.',
              'The project is not closed with any open issues.',
              'Field PM follows up with the lead and updates the tracker.',
            ],
            roles: ['Field PM', 'Technician/Lead Tech'],
          },
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
              description: 'Field PM determines the next step and assigns the appropriate resource.',
            },
          },
        ],
      },
      {
        name: 'Weekly',
        nodes: [
          {
            type: 'task',
            id: 'task-weekly-tasks',
            title: 'Weekly Tasks',
            summary: 'Admin sends weekly updates; PM owns escalations; Procurement handles RMAs.',
            details: [
              'Admin — sends routine weekly status updates to the client (Template: Weekly Customer Update — content from Field PM).',
              'Field PM — owns all non-routine customer communication, escalations, and technical conversations.',
              'Procurement / Logistics — RMA processing, additional material procurement, shipping ETAs in ConnectWise.',
              'Inside PM / Accountant — tracks labor, costs, change impacts, and margin status; flags variances.',
              'All roles update the Sales Rep as major milestones are reached or issues arise.',
            ],
            roles: ['Admin', 'Field PM', 'Procurement / Logistics', 'Inside PM / Accountant', 'Sales Rep'],
          },
        ],
      },
      {
        name: 'Notes',
        nodes: [
          {
            type: 'task',
            id: 'task-project-notes',
            title: 'Project Notes',
            summary: 'Field PM maintains project notes in preferred tracking method.',
            details: [
              'Field PM maintains project notes in their preferred tracking method (Excel, Gantt, notepad); templated trackers available upon request.',
            ],
            roles: ['Field PM'],
          },
        ],
      },
    ],
  },
  {
    type: 'decision',
    id: 'decision-change-order-needed',
    title: 'Change Order Needed?',
    roles: ['Field PM', 'Project Engineer'],
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
          summary: 'Field PM opens OPP in ConnectWise; PE prepares the CO (engineering always internal).',
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
              'Substantial scope change → schedule a Survey before submitting to customer. Template: Survey — owned by Field PM or designated lead.',
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
        },
      ],
    },
  },
  { type: 'milestone', id: 'milestone-5', number: 5, title: 'Commissioning and Handoff' },
  {
    type: 'stage',
    id: 'stage-commissioning',
    title: 'Commissioning',
    meta: 'Owned by Field PM, with PE supporting as needed.',
  },
  {
    type: 'task',
    id: 'task-commissioning',
    title: 'Commissioning',
    summary: 'Use Functional Narrative as checklist; Field PM captures as-built info for PE.',
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
          optionA: {
            label: 'YES',
            description: 'Open OPP → see the Change Order process.',
          },
          optionB: {
            label: 'NO',
            description: 'Direct the Project Team: Field PM communicates further direction to the project team.',
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
        {
          type: 'task',
          id: 'task-minor-updates',
          title: 'Minor Updates & Cost',
          summary: 'Minor programming updates may be no-cost within the 3-month labor warranty.',
          details: [
            'Minor programming updates (sound levels, fader ranges, visual feedback) — no cost within the 3-month labor warranty period.',
            'Changes that alter functionality as documented may require a change order.',
          ],
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
    roles: ['Field PM', 'Leadership'],
  },
  { type: 'milestone', id: 'milestone-6', number: 6, title: 'Closeout' },
  { type: 'stage', id: 'stage-closeout', title: 'Closeout' },
  {
    type: 'task',
    id: 'task-field-pm-closeout',
    title: 'Field PM Responsibilities',
    summary: 'Communicate completion, compile Closeout Packet, and upload to Teams.',
    details: [
      'Communicate to Inside PM / Accountant when the project is 100% complete.',
      'Compile the Closeout Packet: all executed proposals and change orders, as-built drawings, final functional narrative, final IP scope with all device credentials, final programming files, Warranty Summary.',
      'User Manual (if customer requests) — compiled from as-built GUI screenshots + latest functional narrative.',
      'Submit the Closeout Packet to the customer.',
      'Compress (zip) and upload to Teams; final programming versions uploaded as individual files, labeled with date of work.',
    ],
    roles: ['Field PM'],
  },
  {
    type: 'task',
    id: 'task-procurement-closeout',
    title: 'Procurement / Logistics Responsibilities',
    summary: 'Ensure all RMAs / return-to-stock processed.',
    details: ['Ensure all RMAs / return-to-stock processed.'],
    roles: ['Procurement / Logistics'],
  },
  {
    type: 'task',
    id: 'task-accountant-closeout',
    title: 'Inside PM / Accountant Responsibilities',
    summary: 'Confirm financials closed, run P&L review, update Sales Rep on project completion.',
    details: [
      'Ensure all RMAs / return-to-stock processed (validation in coordination with Procurement).',
      'Confirm project financials are closed.',
      'Run the P&L Review — actionable retrospective intel on labor, costs, change impact, and margin.',
      'Update the Sales Rep that the project is complete.',
      'The functional narrative can serve as a manual and mitigate unnecessary service calls.',
    ],
    roles: ['Inside PM / Accountant', 'Procurement / Logistics', 'Sales Rep'],
  },
  { type: 'milestone', id: 'milestone-7', number: 7, title: 'Project Complete' },
];
