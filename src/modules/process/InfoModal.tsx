'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function InfoModal({ onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b bg-card px-6 py-4">
          <h2 className="font-semibold">Process Reference</h2>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* A. Team Roles */}
          <section>
            <h3 className="text-sm font-semibold mb-3">A. Team Roles</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-semibold">Role</th>
                    <th className="text-left px-3 py-2 font-semibold">Group</th>
                    <th className="text-left px-3 py-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ROLES_INFO.map((r) => (
                    <tr key={r.role} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{r.role}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.group}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* B. Subcontractor Rates */}
          <section>
            <h3 className="text-sm font-semibold mb-3">B. Subcontractor Rates</h3>
            <div className="flex gap-6 text-xs">
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <div className="font-medium">Onsite Labor Sub</div>
                <div className="text-muted-foreground">$65 / hr</div>
              </div>
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <div className="font-medium">Programming Sub</div>
                <div className="text-muted-foreground">$95 / hr</div>
              </div>
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <div className="font-medium">CAD Sub</div>
                <div className="text-muted-foreground">$40 / hr</div>
              </div>
            </div>
          </section>

          {/* C. Templates & Deliverables */}
          <section>
            <h3 className="text-sm font-semibold mb-3">C. Templates &amp; Deliverables</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-semibold">Template</th>
                    <th className="text-left px-3 py-2 font-semibold">Owner</th>
                    <th className="text-left px-3 py-2 font-semibold">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {TEMPLATES_INFO.map((t) => (
                    <tr key={t.template} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{t.template}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.owner}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.stage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const ROLES_INFO = [
  {
    role: 'Field PM',
    group: 'Regional Hub',
    description:
      'Owns in-region execution: onboarding, customer kickoff, packet review, walkthrough, install field guidance, commissioning, change orders, and closeout compilation.',
  },
  {
    role: 'Project Engineer',
    group: 'Central Ops',
    description:
      'Owns engineering: BOM review, IP scope, functional narrative, drawings coordination, packet compilation, and all CO engineering. Always internal.',
  },
  {
    role: 'Inside PM / Accountant',
    group: 'Central Ops',
    description:
      'Tracks labor, costs, change impact, and margin; confirms financials closed and runs the P&L review at closeout.',
  },
  {
    role: 'Procurement / Logistics',
    group: 'Central Ops',
    description:
      'Purchasing, long-lead flagging, RMAs, shipping ETAs, and next-day onsite logistics; receives the clear-for-purchasing handoff.',
  },
  {
    role: 'Admin',
    group: 'Central Ops',
    description:
      'Welcome letter, project schedule, daily-report processing, and routine weekly customer updates.',
  },
  {
    role: 'Technician/Lead Tech',
    group: 'Regional Hub',
    description:
      'Executes the onsite install; the Lead Tech owns daily reports and reports field issues to the Field PM.',
  },
  {
    role: 'Programmer',
    group: 'Central · Internal',
    description:
      'Builds GUI mockups and control programming after UX approval. External equivalent: Programming Sub.',
  },
  {
    role: 'UX Designer',
    group: 'Central · Internal',
    description:
      'Leads the UX Design Review before programming; required on projects with 10+ interfaces. Always internal.',
  },
  {
    role: 'Sales Rep',
    group: '—',
    description:
      "Holds the customer relationship; CC'd at kickoff and updated as milestones are reached or issues arise.",
  },
  {
    role: 'Pre-Sales Engineer',
    group: '—',
    description:
      'Designed the original system; consulted during onboarding to convey design intent.',
  },
  {
    role: 'Leadership',
    group: 'Regional / Central',
    description:
      'Escalation point for capacity concerns and multi-project CAD balancing; receives lessons learned for the knowledge base.',
  },
  {
    role: 'CAD Sub',
    group: 'External · $40/hr',
    description:
      'Drafting — always subbed. Produces drawings, rack/field elevations, and pull schedules.',
  },
  {
    role: 'Programming Sub',
    group: 'External · $95/hr',
    description: 'External programming used when internal capacity is unavailable.',
  },
  {
    role: 'Labor Sub',
    group: 'External · $65/hr',
    description: 'External onsite labor used when internal capacity is insufficient.',
  },
];

const TEMPLATES_INFO = [
  { template: 'Welcome Letter', owner: 'Admin', stage: 'Project Won (48h)' },
  { template: 'Project Schedule', owner: 'Admin · Field PM adjusts', stage: 'Project Won (48h)' },
  { template: 'Internal Kickoff Agenda', owner: 'Field PM', stage: 'Internal Kickoff' },
  { template: 'Functional Narrative', owner: 'Project Engineer', stage: 'Engineering Packet' },
  { template: 'Customer GUI Review', owner: 'UX Designer', stage: 'UX Design Review' },
  { template: 'Engineering Packet', owner: 'Project Engineer', stage: 'Engineering Packet' },
  { template: 'Walkthrough Checklist', owner: 'Field PM', stage: 'Pre-Install Prep' },
  { template: 'Survey', owner: 'Field PM', stage: 'Change Orders' },
  { template: 'Daily Report', owner: 'Lead Tech · Admin processes', stage: 'Onsite Install (daily)' },
  {
    template: 'Weekly Customer Update',
    owner: 'Admin · from Field PM',
    stage: 'Onsite Install (weekly)',
  },
  { template: 'Closeout Packet', owner: 'Field PM', stage: 'Closeout' },
];
