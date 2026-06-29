"use client";

import { useState } from "react";
import { calcFinancials, fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import { memberPayoutCents, memberRateBps, DEFAULT_COMMISSION_MATRIX, POD_COMMISSION_MATRIX } from "@/modules/deal-desk/lib/commission-engine";
import { useDealDeskUser } from "@/modules/deal-desk/hooks/useDealDeskUser";
import { UserPicker } from "@/components/shared/UserPicker";
import type { DealDeskQuote, CommissionStatus, TeamMember, RoleKey } from "@/types/deal-desk";
import { COMMISSION_STATUSES } from "@/types/deal-desk";
import type { AppUser } from "@/types/user";
import { cn } from "@/lib/utils";

interface CommissionPanelProps {
  quote: DealDeskQuote;
  onCommissionStatusChange?: (status: CommissionStatus) => void;
  onUpdate?: (updated: DealDeskQuote) => void;
}

const ROLE_OPTIONS: { key: RoleKey; label: string }[] = [
  { key: "director", label: "Director" },
  { key: "bd",       label: "Business Development" },
  { key: "de",       label: "Design Engineer" },
  { key: "custom",   label: "Custom Rate" },
];

export function CommissionPanel({ quote, onCommissionStatusChange, onUpdate }: CommissionPanelProps) {
  const [showMatrix, setShowMatrix] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newUser, setNewUser] = useState<AppUser | null>(null);
  const [newRole, setNewRole] = useState<RoleKey>("bd");
  const [newCustomPct, setNewCustomPct] = useState("3.33");
  const { userName, isManagement } = useDealDeskUser();
  const f = calcFinancials(quote.categories, quote.projectType);
  const rev = f.revenueCents;
  const isPod = quote.projectType === "Pod";

  const teamRows = quote.team.map((m) => ({
    member: m,
    rateBps: memberRateBps(m, f.band),
    payoutCents: memberPayoutCents(rev, m, f.band),
  }));

  const totalPayoutCents = teamRows.reduce((s, r) => s + r.payoutCents, 0);

  const myRow = userName
    ? teamRows.find((r) => r.member.name === userName)
    : undefined;
  const visibleRows = isManagement ? teamRows : (myRow ? [myRow] : []);

  const displayMatrix = isPod ? POD_COMMISSION_MATRIX : DEFAULT_COMMISSION_MATRIX;

  function handleAddMember() {
    if (!newUser || !onUpdate) return;
    const member: TeamMember = {
      id: crypto.randomUUID(),
      userId: newUser.id,
      avatarUrl: newUser.avatarUrl,
      name: newUser.name,
      role: ROLE_OPTIONS.find((r) => r.key === newRole)?.label ?? newRole,
      matrixKey: newRole,
      customRateBps: newRole === "custom" ? Math.round(parseFloat(newCustomPct) * 100) : undefined,
    };
    onUpdate({ ...quote, team: [...quote.team, member] });
    setNewUser(null);
    setNewUserId("");
    setNewRole("bd");
    setAddingMember(false);
  }

  function handleRemoveMember(id: string) {
    if (!onUpdate) return;
    onUpdate({ ...quote, team: quote.team.filter((m) => m.id !== id) });
  }

  return (
    <div className="space-y-6">
      {/* Band callout */}
      <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Commission Band · <span className="font-medium">{quote.projectType}</span>
            </div>
            <div className="text-xl font-bold">{f.band.label}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {fmtPct(f.bandLookupPct, 2)} {f.bandLookupLabel.toLowerCase()} · {fmtPct(f.band.totalBps / 100, 2)} total rate on revenue
            </div>
          </div>
          {isManagement && (
            <button
              type="button"
              onClick={() => setShowMatrix(!showMatrix)}
              className="text-xs text-primary hover:underline whitespace-nowrap"
            >
              {showMatrix ? "Hide" : "View"} full matrix
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Total Revenue</div>
            <div className="text-base font-bold">{fmtUSD(rev)}</div>
          </div>
          {isManagement ? (
            <div>
              <div className="text-xs text-muted-foreground">Commission Pool ({fmtPct(f.band.totalBps / 100, 2)})</div>
              <div className="text-base font-bold text-violet-700">{fmtUSD(f.commissionPoolCents)}</div>
            </div>
          ) : myRow ? (
            <div>
              <div className="text-xs text-muted-foreground">Your Commission ({fmtPct(myRow.rateBps / 100, 2)})</div>
              <div className="text-base font-bold text-violet-700">{fmtUSD(myRow.payoutCents)}</div>
            </div>
          ) : (
            <div />
          )}
          {isManagement && (
            <div>
              <div className="text-xs text-muted-foreground">Commission Status</div>
              <select
                value={quote.commissionStatus}
                onChange={(e) => onCommissionStatusChange?.(e.target.value as CommissionStatus)}
                className="mt-0.5 rounded-md border bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {COMMISSION_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {isPod && isManagement && (
          <div className="mt-3 rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
            Pod uses the same gross margin % band lookup as Enterprise, but applies different commission rates (no Director split).
          </div>
        )}
      </div>

      {/* Full commission matrix — management only */}
      {isManagement && showMatrix && (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <div className="px-4 py-2.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
            {isPod
              ? "Pod/SE Commission Matrix — band by Gross Margin %"
              : "Enterprise Commission Matrix — band by Gross Margin %"}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-muted-foreground">{f.bandLookupLabel} Band</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">Total</th>
                {!isPod && <th className="px-4 py-2 text-right text-xs text-muted-foreground">Director</th>}
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">BD</th>
                <th className="px-4 py-2 text-right text-xs text-muted-foreground">DE</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayMatrix.map((band) => (
                <tr key={band.label} className={cn(band.label === f.band.label && "bg-primary/10 font-semibold")}>
                  <td className="px-4 py-2">{band.label}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtPct(band.totalBps / 100, 2)}</td>
                  {!isPod && <td className="px-4 py-2 text-right tabular-nums">{fmtPct(band.directorBps / 100, 2)}</td>}
                  <td className="px-4 py-2 text-right tabular-nums">{fmtPct(band.bdBps / 100, 2)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtPct(band.deBps / 100, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Team payout table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {isManagement ? "Team Payouts" : "Your Commission"}
          </h3>
          {isManagement && onUpdate && !addingMember && (
            <button
              type="button"
              onClick={() => setAddingMember(true)}
              className="text-xs text-primary hover:underline font-medium"
            >
              + Add Member
            </button>
          )}
        </div>

        {/* Add member form */}
        {isManagement && addingMember && (
          <div className="px-5 py-4 border-b bg-muted/10 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Person</label>
                <UserPicker
                  value={newUserId}
                  onChange={(u) => { setNewUser(u); setNewUserId(u?.id ?? ""); }}
                  placeholder="Search users…"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Role / Rate</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as RoleKey)}
                  className="w-full rounded-md border bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {newRole === "custom" && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">Custom Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={newCustomPct}
                  onChange={(e) => setNewCustomPct(e.target.value)}
                  className="w-28 rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setAddingMember(false); setNewUser(null); setNewUserId(""); }}
                className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!newUser}
                className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {visibleRows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            {isManagement
              ? "No team members assigned. Use \"+ Add Member\" to assign commission recipients."
              : "You are not listed as a team member on this project."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs text-muted-foreground">Name</th>
                <th className="px-5 py-2.5 text-left text-xs text-muted-foreground">Role</th>
                <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">Rate</th>
                <th className="px-5 py-2.5 text-right text-xs text-muted-foreground">Payout</th>
                {isManagement && <th className="px-5 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleRows.map(({ member, rateBps, payoutCents }) => (
                <tr key={member.id}>
                  <td className="px-5 py-3 font-medium">{member.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{member.role}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{fmtPct(rateBps / 100, 2)}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold text-violet-700">{fmtUSD(payoutCents)}</td>
                  {isManagement && (
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {isManagement && (
                <tr className="border-t-2 bg-muted/20 font-semibold">
                  <td className="px-5 py-3" colSpan={3}>Total Commission Payout</td>
                  <td className="px-5 py-3 text-right tabular-nums text-violet-700">{fmtUSD(totalPayoutCents)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Full profit distribution — management only */}
      {isManagement && (
        <div className="rounded-lg border bg-card p-5 space-y-1">
          <h3 className="text-sm font-semibold mb-3">Full Profit Distribution</h3>
          {[
            ["Commission Pool",       fmtUSD(f.commissionPoolCents),          fmtPct(f.band.totalBps / 100, 2)],
            ["Mason Share",           fmtUSD(f.masonShareCents),               fmtPct((f.masonShareCents / (rev || 1)) * 100, 1)],
            ["Salaries & Overhead",   fmtUSD(f.salariesOverheadCents),         "12.00%"],
            ["Mason Profit",          fmtUSD(f.masonProfitCents),              fmtPct((f.masonProfitCents / (rev || 1)) * 100, 2)],
            ["Leadership Bonus",      fmtUSD(f.leadershipBonusCents),          fmtPct((f.leadershipBonusCents / (rev || 1)) * 100, 2)],
            ["Mason Retained Profit", fmtUSD(f.masonRetainedProfitCents),      fmtPct((f.masonRetainedProfitCents / (rev || 1)) * 100, 2)],
          ].map(([label, value, pct]) => (
            <div key={label} className="flex justify-between py-1.5 border-b last:border-0 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <div className="flex gap-4 tabular-nums">
                <span className="text-muted-foreground w-14 text-right">{pct}</span>
                <span className="font-medium w-28 text-right">{value}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
