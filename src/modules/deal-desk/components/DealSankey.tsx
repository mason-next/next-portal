"use client";

import type { DealFinancials } from "@/modules/deal-desk/lib/financial-calc";
import { fmtUSD, fmtPct } from "@/modules/deal-desk/lib/financial-calc";
import { memberPayoutCents, memberRateBps } from "@/modules/deal-desk/lib/commission-engine";
import type { TeamMember } from "@/types/deal-desk";

interface Props {
  f: DealFinancials;
  team?: TeamMember[];
}

const NW = 12;
const GAP = 5;
const H = 290; // base canvas height (scaled to revenue)

// Team members get their own column at x=COL[3]; remaining cols shift right
const COL_NO_TEAM  = [0, 178, 356, 494, 614]; // 5 columns: rev, col1, col2, col3, col4
const COL_TEAM     = [0, 148, 296, 424, 540, 660]; // 6 columns: rev, col1, col2, team, col3, col4

const MEMBER_COLORS = ["#8b5cf6", "#a78bfa", "#7c3aed", "#6d28d9", "#5b21b6"];

const C = {
  revenue:  "#3b82f6",
  cogs:     "#f97316",
  gp:       "#10b981",
  commPool: "#8b5cf6",
  mShare:   "#06b6d4",
  salaries: "#94a3b8",
  mProfit:  "#14b8a6",
  lb:       "#f59e0b",
  mrp:      "#16a34a",
};

function flowPath(x0: number, sy: number, sh: number, x1: number, dy: number, dh: number): string {
  const mx = (x0 + NW + x1) / 2;
  return [
    `M${x0 + NW},${sy}`,
    `C${mx},${sy} ${mx},${dy} ${x1},${dy}`,
    `L${x1},${dy + dh}`,
    `C${mx},${dy + dh} ${mx},${sy + sh} ${x0 + NW},${sy + sh}`,
    "Z",
  ].join(" ");
}

function Bar({ x, y, h, color }: { x: number; y: number; h: number; color: string }) {
  return <rect x={x} y={y} width={NW} height={Math.max(2, h)} fill={color} rx={2} />;
}

function Label({ x, y, h, name, sub, color }: { x: number; y: number; h: number; name: string; sub: string; color: string }) {
  const cy = y + Math.max(2, h) / 2;
  return (
    <g>
      <text x={x + NW + 7} y={cy - 5} fontSize={9} fontWeight={600} fill={color}>{name}</text>
      <text x={x + NW + 7} y={cy + 6} fontSize={8.5} fill="#6b7280">{sub}</text>
    </g>
  );
}

export function DealSankey({ f, team }: Props) {
  const rev = f.revenueCents;
  if (rev <= 0) return null;

  const hasTeam = team && team.length > 0;
  const COL = hasTeam ? COL_TEAM : COL_NO_TEAM;

  const scale = H / rev;
  const px = (c: number) => Math.max(2, c * scale);

  // Core heights
  const cogsH   = px(f.costCents);
  const gpH     = px(f.grossProfitCents);
  const commH   = px(f.commissionPoolCents);
  const mShareH = px(f.masonShareCents);
  const salH    = px(f.salariesOverheadCents);
  const mProfH  = px(f.masonProfitCents);
  const lbH     = px(f.leadershipBonusCents);
  const mrpH    = px(f.masonRetainedProfitCents);

  // Y positions
  const cogsY    = 0;
  const gpY      = cogsH + GAP;
  const commY    = gpY;
  const mShareY  = commY + commH + GAP;
  const salY     = mShareY;
  const mProfY   = salY + salH + GAP;
  const lbY      = mProfY;
  const mrpY     = lbY + lbH + GAP;
  const revH     = cogsH + GAP + gpH;

  // Team member layout (when team is assigned)
  type MemberSlot = { member: TeamMember; payoutCents: number; color: string; y: number; h: number };
  let memberSlots: MemberSlot[] = [];
  if (hasTeam && team) {
    let cursor = commY;
    memberSlots = team.map((m, i) => {
      const payoutCents = memberPayoutCents(rev, m, f.band);
      const h = Math.max(2, px(payoutCents));
      const slot: MemberSlot = { member: m, payoutCents, color: MEMBER_COLORS[i % MEMBER_COLORS.length], y: cursor, h };
      cursor += h + GAP;
      return slot;
    });
  }

  // Downstream column indices
  const salCol   = hasTeam ? 4 : 3;
  const finalCol = hasTeam ? 5 : 4;

  const svgH = Math.max(H, mrpY + mrpH, hasTeam ? (memberSlots.at(-1)?.y ?? 0) + (memberSlots.at(-1)?.h ?? 0) : 0) + 20;
  const pctOf = (c: number) => fmtPct((c / rev) * 100, 1);

  return (
    <svg
      viewBox={`0 0 ${COL[finalCol] + 170} ${svgH}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      aria-label="Profit distribution Sankey diagram"
    >
      {/* ── Flows ── */}
      <path d={flowPath(COL[0], 0,         cogsH,   COL[1], cogsY,   cogsH)}   fill={C.cogs}     opacity={0.28} />
      <path d={flowPath(COL[0], cogsH,     gpH,     COL[1], gpY,     gpH)}     fill={C.gp}       opacity={0.28} />
      <path d={flowPath(COL[1], gpY,       commH,   COL[2], commY,   commH)}   fill={C.commPool}  opacity={0.28} />
      <path d={flowPath(COL[1], gpY+commH, mShareH, COL[2], mShareY, mShareH)} fill={C.mShare}   opacity={0.28} />

      {hasTeam ? (
        // Commission Pool → each team member
        memberSlots.map((slot, i) => {
          const srcOffset = memberSlots.slice(0, i).reduce((s, ms) => s + ms.h, 0) + i * 0;
          return (
            <path
              key={slot.member.id}
              d={flowPath(COL[2], commY + srcOffset, slot.h, COL[3], slot.y, slot.h)}
              fill={slot.color}
              opacity={0.28}
            />
          );
        })
      ) : null}

      <path d={flowPath(COL[2], mShareY,       salH,   COL[salCol],   salY,   salH)}   fill={C.salaries} opacity={0.28} />
      <path d={flowPath(COL[2], mShareY + salH, mProfH, COL[salCol],  mProfY, mProfH)} fill={C.mProfit}  opacity={0.28} />
      <path d={flowPath(COL[salCol], mProfY,       lbH,  COL[finalCol], lbY,   lbH)}   fill={C.lb}       opacity={0.28} />
      <path d={flowPath(COL[salCol], mProfY + lbH, mrpH, COL[finalCol], mrpY,  mrpH)}  fill={C.mrp}      opacity={0.28} />

      {/* ── Bars ── */}
      <Bar x={COL[0]} y={0}       h={revH}    color={C.revenue}  />
      <Bar x={COL[1]} y={cogsY}   h={cogsH}   color={C.cogs}     />
      <Bar x={COL[1]} y={gpY}     h={gpH}     color={C.gp}       />
      <Bar x={COL[2]} y={commY}   h={commH}   color={C.commPool} />
      <Bar x={COL[2]} y={mShareY} h={mShareH} color={C.mShare}   />
      {hasTeam
        ? memberSlots.map((slot) => <Bar key={slot.member.id} x={COL[3]} y={slot.y} h={slot.h} color={slot.color} />)
        : null}
      <Bar x={COL[salCol]}   y={salY}   h={salH}   color={C.salaries} />
      <Bar x={COL[salCol]}   y={mProfY} h={mProfH} color={C.mProfit}  />
      <Bar x={COL[finalCol]} y={lbY}    h={lbH}    color={C.lb}       />
      <Bar x={COL[finalCol]} y={mrpY}   h={mrpH}   color={C.mrp}      />

      {/* ── Labels ── */}
      {/* Revenue — left-anchored */}
      <text x={COL[0] - 4} y={revH / 2 - 4}  fontSize={9}   fontWeight={700} fill={C.revenue} textAnchor="end">Revenue</text>
      <text x={COL[0] - 4} y={revH / 2 + 7}  fontSize={8.5} fill="#6b7280"   textAnchor="end">{fmtUSD(rev)}</text>

      <Label x={COL[1]} y={cogsY}   h={cogsH}   name="Job Cost / COGS"     sub={`${fmtUSD(f.costCents)} · ${pctOf(f.costCents)}`}                          color={C.cogs}     />
      <Label x={COL[1]} y={gpY}     h={gpH}     name="Gross Profit"         sub={`${fmtUSD(f.grossProfitCents)} · ${fmtPct(f.grossMarginPct, 1)}`}          color={C.gp}       />
      <Label x={COL[2]} y={commY}   h={commH}   name="Commission Pool"      sub={`${fmtUSD(f.commissionPoolCents)} · ${pctOf(f.commissionPoolCents)}`}       color={C.commPool} />
      <Label x={COL[2]} y={mShareY} h={mShareH} name="Mason Share"          sub={`${fmtUSD(f.masonShareCents)} · ${pctOf(f.masonShareCents)}`}              color={C.mShare}   />

      {hasTeam
        ? memberSlots.map((slot) => {
            const rateBps = memberRateBps(slot.member, f.band);
            return (
              <Label
                key={slot.member.id}
                x={COL[3]} y={slot.y} h={slot.h}
                name={slot.member.name || slot.member.role}
                sub={`${fmtUSD(slot.payoutCents)} · ${fmtPct(rateBps / 100, 2)}`}
                color={slot.color}
              />
            );
          })
        : null}

      <Label x={COL[salCol]}   y={salY}   h={salH}   name="Salaries & Overhead" sub={`${fmtUSD(f.salariesOverheadCents)} · 12.0%`}                           color={C.salaries} />
      <Label x={COL[salCol]}   y={mProfY} h={mProfH} name="Mason Profit"        sub={`${fmtUSD(f.masonProfitCents)} · ${pctOf(f.masonProfitCents)}`}         color={C.mProfit}  />
      <Label x={COL[finalCol]} y={lbY}    h={lbH}    name="Leadership Bonus"    sub={`${fmtUSD(f.leadershipBonusCents)} · ${pctOf(f.leadershipBonusCents)}`}  color={C.lb}       />
      <Label x={COL[finalCol]} y={mrpY}   h={mrpH}   name="Retained Profit"     sub={`${fmtUSD(f.masonRetainedProfitCents)} · ${pctOf(f.masonRetainedProfitCents)}`} color={C.mrp} />
    </svg>
  );
}
