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
      'The primary driver of project execution at the regional level. The Field PM is responsible for the success of every project stage from internal kickoff through closeout — coordinating resources, owning the customer relationship in region, managing change orders, and ensuring each handoff is clean. When anything stalls, the Field PM identifies the path forward.',
  },
  {
    role: 'Project Engineer',
    group: 'Central Ops',
    description:
      'The technical authority on every project. The PE owns all engineering from initial BOM review through closeout — defining IP scope, authoring the functional narrative, coordinating drawings, and handling all change order engineering. Engineering work is always kept internal, and the PE\'s deliverables set the standard that the entire field team executes against.',
  },
  {
    role: 'Inside PM',
    group: 'Central Ops',
    description:
      'The financial and logistics backbone of every active project. The Inside PM tracks labor hours, material costs, and margin — surfacing variances before they become problems and ensuring the books close clean. They also own daily logistics coordination: routing, shipping requests, and supply alignment so field crews have what they need each day. Closely partnered with the Field PM and Procurement throughout the install.',
  },
  {
    role: 'Procurement',
    group: 'Central Ops',
    description:
      'Bridges engineering intent and physical delivery. Procurement takes ownership of the BOM after the PE\'s clear-for-purchasing handoff — managing purchasing, flagging long-lead items early, coordinating RMAs, and ensuring the right materials are onsite when the crew needs them. Their visibility into logistics directly affects install schedule.',
  },
  {
    role: 'Admin',
    group: 'Central Ops',
    description:
      'The communication hub that keeps customers informed and the team organized. Admin handles templated outreach — welcome letters, project schedules, daily report distribution, and routine weekly updates — so the Field PM can stay focused on project execution rather than routine correspondence.',
  },
  {
    role: 'Technician',
    group: 'Regional Hub',
    description:
      'The skilled hands who execute the installation. The Lead Tech directs the field crew, submits daily reports, and serves as the Field PM\'s primary eyes and ears on the jobsite. Issues that can\'t be resolved in the field are escalated immediately so the PM can mobilize the right resources.',
  },
  {
    role: 'Programmer',
    group: 'Central · Internal',
    description:
      'Responsible for translating the approved system design into working control programming and GUI interfaces. Programmers engage after the UX review stage, ensuring the software matches the functional narrative and GUI mockups before anything reaches the customer. Internal programming is always preferred.',
  },
  {
    role: 'UX Designer',
    group: 'Central · Internal',
    description:
      'Owns the customer-facing interface design process for projects with significant control UI. The UX Designer leads the GUI review prior to programming — ensuring the customer\'s interaction experience is intentional and approved before a single line of code is written. Required on all projects with 10 or more interfaces.',
  },
  {
    role: 'Sales Rep',
    group: '—',
    description:
      'The original relationship owner. While not involved in day-to-day project management, the Sales Rep holds the customer\'s trust and should be kept current at key milestones and whenever issues arise. Their context on customer expectations and sensitivities is a valuable resource throughout the project lifecycle.',
  },
  {
    role: 'Pre-Sales Engineer',
    group: '—',
    description:
      'The architect of the original system design. Consulted early in the onboarding phase to transfer design intent to the project team — ensuring that the nuances of the proposed solution aren\'t lost between the sales process and execution. Their involvement reduces assumption-based scope errors.',
  },
  {
    role: 'CAD Engineer',
    group: 'External · $40/hr',
    description:
      'External drafting resource engaged by the Project Engineer. Produces all construction drawings, rack and field elevations, and pull schedules required for installation. Always subcontracted; deliverables are incorporated into the Engineering Packet and Closeout documentation.',
  },
];

const TEMPLATES_INFO = [
  { template: 'Welcome Letter', owner: 'Admin', stage: 'Project Won (48h)' },
  { template: 'Project Schedule', owner: 'Admin · Field PM adjusts', stage: 'Project Won (48h)' },
  { template: 'Internal Kickoff Agenda', owner: 'Field PM', stage: 'Internal Kickoff' },
  { template: 'Functional Narrative', owner: 'Project Engineer', stage: 'Engineering Packet' },
  { template: 'Customer GUI Review', owner: 'UX Designer', stage: 'UX Design Review' },
  { template: 'IP Scope', owner: 'Project Engineer', stage: 'Engineering Packet' },
  { template: 'Engineering Packet', owner: 'Project Engineer', stage: 'Engineering Packet' },
  { template: 'Walkthrough Checklist', owner: 'Field PM', stage: 'Pre-Install Prep' },
  { template: 'Survey', owner: 'Field PM', stage: 'Change Orders' },
  { template: 'Daily Report', owner: 'Lead Tech · Admin processes', stage: 'Onsite Install (daily)' },
  { template: 'Issue Tracker', owner: 'Field PM', stage: 'Onsite Install' },
  { template: 'Weekly Customer Update', owner: 'Admin · from Field PM', stage: 'Onsite Install (weekly)' },
  { template: 'Closeout Packet', owner: 'Field PM', stage: 'Closeout' },
];
