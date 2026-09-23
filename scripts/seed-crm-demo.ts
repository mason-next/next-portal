/**
 * Loads realistic CRM demo data (accounts, opportunities, contacts, dated notes,
 * follow-ups, leads) so the CRM pages can be tried out locally.
 *
 *   npx tsx scripts/seed-crm-demo.ts            # add demo data
 *   npx tsx scripts/seed-crm-demo.ts --reset    # remove previous demo rows first
 *
 * Every row it creates has an id starting with "demo_", so --reset only touches
 * demo data. It refuses to run when NODE_ENV=production or when DATABASE_URL does
 * not point at localhost — never run it against the shared Railway database.
 *
 * It also gives the seeded users portal roles when they have none (Juan Lazo →
 * Administrator; Marcus Reed, Sandra Verissimo, Alex Behan → Sales) so you can log
 * in as a manager or as a rep to see both permission views.
 */

import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";
if (process.env.NODE_ENV === "production" || !/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("Refusing to seed demo data: DATABASE_URL must point at a local database (localhost).");
  process.exit(1);
}

const db = new PrismaClient();
const DAY = 86_400_000;
const at = (days: number) => {
  const d = new Date(Date.now() + days * DAY);
  d.setUTCHours(12, 0, 0, 0);
  return d;
};

type Stage = "Prospecting" | "Qualifying" | "Proposal" | "ClosedWon" | "ClosedLost";

async function main() {
  if (process.argv.includes("--reset")) {
    const demo = { startsWith: "demo_" };
    await db.salesNote.deleteMany({ where: { id: demo } });
    await db.salesTask.deleteMany({ where: { OR: [{ id: demo }, { companyId: demo }] } });
    await db.salesLead.deleteMany({ where: { id: demo } });
    await db.salesAuditLog.deleteMany({ where: { companyId: demo } });
    await db.salesCompany.deleteMany({ where: { id: demo } });
    console.log("Removed previous demo data.");
  }

  const users = await db.user.findMany({ select: { id: true, name: true, roleTypes: true } });
  const byName = (n: string) => users.find((u) => u.name === n);
  const roleGrants: Record<string, ("Administrator" | "Sales")[]> = {
    "Juan Lazo": ["Administrator"],
    "Marcus Reed": ["Sales"],
    "Sandra Verissimo": ["Sales"],
    "Alex Behan": ["Sales"],
  };
  for (const [name, roles] of Object.entries(roleGrants)) {
    const u = byName(name);
    if (u && u.roleTypes.length === 0) await db.user.update({ where: { id: u.id }, data: { roleTypes: roles } });
  }

  const rep = (name: string) => ({ id: byName(name)?.id ?? null, name });
  const juan = rep("Juan Lazo"), marcus = rep("Marcus Reed"), sandra = rep("Sandra Verissimo"), alex = rep("Alex Behan");

  const accounts = [
    { key: "harbor",   name: "Harbor Health System",       domain: "harborhealth.org",  owner: marcus, status: "Customer", territory: "Southeast", vertical: "Healthcare" },
    { key: "lakeside", name: "Lakeside Unified Schools",   domain: "lakesideusd.org",   owner: sandra, status: "Prospect", territory: "Midwest",   vertical: "Education" },
    { key: "copper",   name: "Copperline Manufacturing",   domain: "copperline.com",    owner: alex,   status: "Prospect", territory: "Southeast", vertical: "Manufacturing" },
    { key: "vantage",  name: "Vantage Credit Union",       domain: "vantagecu.com",     owner: marcus, status: "Customer", territory: "Northeast", vertical: "Financial Services" },
    { key: "summit",   name: "Summit County Government",   domain: "summitcounty.gov",  owner: sandra, status: "Prospect", territory: "Midwest",   vertical: "Public Sector" },
    { key: "bluefin",  name: "Bluefin Logistics",          domain: "bluefinlogistics.com", owner: alex, status: "Former Customer", territory: "West", vertical: "Logistics" },
    { key: "orchard",  name: "Orchard Senior Living",      domain: "orchardliving.com", owner: marcus, status: "Prospect", territory: "Southeast", vertical: "Healthcare" },
    { key: "northgate",name: "Northgate Hotels",           domain: "northgatehotels.com", owner: juan, status: "Partner", territory: "West",      vertical: "Hospitality" },
  ];

  for (const a of accounts) {
    await db.salesCompany.upsert({
      where: { id: `demo_${a.key}` },
      update: {},
      create: {
        id: `demo_${a.key}`, name: a.name, domain: a.domain, ownerId: a.owner.id, ownerName: a.owner.name,
        accountStatus: a.status, territory: a.territory, vertical: a.vertical,
      },
    });
  }

  const opps: {
    key: string; acct: string; name: string; stage: Stage; owner: { id: string | null; name: string };
    value: number; close: number; prob?: number; next?: string; nextIn?: number; nextOwner?: { id: string | null; name: string }; source?: string;
  }[] = [
    { key: "h1", acct: "harbor", name: "Clinic Wi-Fi 6E refresh (12 sites)", stage: "Proposal", owner: marcus, value: 412000, close: 12, prob: 75, next: "Send revised quote with 5-yr support", nextIn: 2, source: "Existing Customer" },
    { key: "h2", acct: "harbor", name: "Nurse-call integration", stage: "Qualifying", owner: marcus, value: 96000, close: 40, next: "Demo integration with CNO", nextIn: -3, nextOwner: juan },
    { key: "h3", acct: "harbor", name: "Main campus access control", stage: "ClosedWon", owner: marcus, value: 188000, close: -45 },
    { key: "l1", acct: "lakeside", name: "District-wide camera upgrade", stage: "Qualifying", owner: sandra, value: 265000, close: 75, next: "Confirm E-rate timeline with CFO", nextIn: 6, source: "Event" },
    { key: "l2", acct: "lakeside", name: "Stadium PA & scoreboard", stage: "Prospecting", owner: sandra, value: 58000, close: 120 },
    { key: "c1", acct: "copper", name: "Plant floor network segmentation", stage: "Proposal", owner: alex, value: 174000, close: 21, prob: 60, next: "Walk plant 2 with OT lead", nextIn: 1, source: "Referral" },
    { key: "c2", acct: "copper", name: "Warehouse DAS", stage: "Proposal", owner: alex, value: 88000, close: -4 },
    { key: "v1", acct: "vantage", name: "Branch SD-WAN (22 branches)", stage: "Proposal", owner: marcus, value: 530000, close: 30, prob: 85, next: "Legal redlines back to procurement", nextIn: 4, nextOwner: juan },
    { key: "v2", acct: "vantage", name: "Drive-thru teller video", stage: "ClosedLost", owner: marcus, value: 64000, close: -20 },
    { key: "s1", acct: "summit", name: "911 dispatch console refresh", stage: "Proposal", owner: sandra, value: 310000, close: 55, next: "Council budget vote", nextIn: 18 },
    { key: "s2", acct: "summit", name: "Courthouse security cameras", stage: "Qualifying", owner: sandra, value: 142000, close: 95 },
    { key: "b1", acct: "bluefin", name: "Win-back: yard Wi-Fi", stage: "Prospecting", owner: alex, value: 70000, close: 140 },
    { key: "o1", acct: "orchard", name: "Resident emergency pendants (6 communities)", stage: "Qualifying", owner: marcus, value: 225000, close: 60, source: "Website" },
    { key: "n1", acct: "northgate", name: "Guest Wi-Fi managed service", stage: "ClosedWon", owner: juan, value: 150000, close: -10 },
  ];

  for (const o of opps) {
    await db.salesOpportunity.upsert({
      where: { id: `demo_${o.key}` },
      update: {},
      create: {
        id: `demo_${o.key}`, companyId: `demo_${o.acct}`, name: o.name, stage: o.stage,
        ownerId: o.owner.id, ownerName: o.owner.name, value: o.value * 100, closeDate: at(o.close),
        probability: o.prob ?? null, nextStep: o.next ?? "", nextStepDate: o.nextIn !== undefined ? at(o.nextIn) : null,
        nextStepOwnerId: o.nextOwner?.id ?? null, nextStepOwnerName: o.nextOwner?.name ?? "",
        leadSource: o.source ?? "", stageChangedAt: at(-Math.floor(Math.random() * 40) - 3),
      },
    });
  }

  const contacts = [
    { key: "h_cio", acct: "harbor", name: "Renee Alvarez", title: "CIO", email: "ralvarez@harborhealth.org" },
    { key: "h_cno", acct: "harbor", name: "Tom Becker", title: "Chief Nursing Officer", email: "tbecker@harborhealth.org" },
    { key: "l_cfo", acct: "lakeside", name: "Gloria Park", title: "CFO", email: "gpark@lakesideusd.org" },
    { key: "c_ot", acct: "copper", name: "Dev Patel", title: "OT Engineering Lead", email: "dpatel@copperline.com" },
    { key: "v_cto", acct: "vantage", name: "Mike O'Neal", title: "CTO", email: "moneal@vantagecu.com" },
    { key: "s_it", acct: "summit", name: "Linda Cho", title: "IT Director", email: "lcho@summitcounty.gov" },
  ];
  for (const c of contacts) {
    await db.salesContact.upsert({
      where: { id: `demo_${c.key}` },
      update: {},
      create: { id: `demo_${c.key}`, companyId: `demo_${c.acct}`, name: c.name, title: c.title, email: c.email },
    });
  }

  const notes: { key: string; acct: string; opp?: string; contact?: string; by: { id: string | null; name: string }; daysAgo: number; kind: string; body: string; pinned?: boolean }[] = [
    { key: "n1", acct: "harbor", by: marcus, daysAgo: 1, kind: "Meeting", contact: "h_cio", opp: "h1", body: "QBR with Renee. Budget approved for FY26 Q1. She wants 5-year support pricing and a phased rollout starting with the two urgent-care sites. Decision by end of month." },
    { key: "n2", acct: "harbor", by: marcus, daysAgo: 9, kind: "Call", contact: "h_cno", opp: "h2", body: "Tom is worried about alarm fatigue. Needs to see the nurse-call → mobile integration live before he'll sponsor it." },
    { key: "n3", acct: "harbor", by: juan, daysAgo: 30, kind: "Note", body: "Account-wide: Harbor is consolidating vendors in 2026 — we are on the shortlist of 3 for all low-voltage work. Keep exec relationship warm.", pinned: true },
    { key: "n4", acct: "lakeside", by: sandra, daysAgo: 4, kind: "Email", contact: "l_cfo", opp: "l1", body: "Gloria confirmed E-rate Category 2 funds are available but the filing window closes March 15. Needs our Form 470 support." },
    { key: "n5", acct: "copper", by: alex, daysAgo: 2, kind: "Site Visit", contact: "c_ot", opp: "c1", body: "Walked plant 1. Flat network, PLCs on the same VLAN as office PCs. Dev is our champion; plant manager is skeptical about downtime. Proposed weekend cutovers." },
    { key: "n6", acct: "copper", by: alex, daysAgo: 21, kind: "Call", opp: "c2", body: "DAS deal stalled — waiting on landlord approval for roof penetrations." },
    { key: "n7", acct: "vantage", by: marcus, daysAgo: 3, kind: "Meeting", contact: "v_cto", opp: "v1", body: "Mike verbally selected us for SD-WAN. Procurement is sending MSA redlines; limitation of liability is the sticking point." },
    { key: "n8", acct: "vantage", by: marcus, daysAgo: 25, kind: "Note", opp: "v2", body: "Lost teller video to incumbent on price (~18% lower). Revisit at their 2027 refresh." },
    { key: "n9", acct: "summit", by: sandra, daysAgo: 6, kind: "Meeting", contact: "s_it", opp: "s1", body: "Linda presented our dispatch proposal to the county administrator. Goes to council budget vote in ~3 weeks." },
    { key: "n10", acct: "orchard", by: marcus, daysAgo: 45, kind: "Call", body: "Intro call with regional ops. Interested in pendants + staff duress for 6 communities. Following up after their budget cycle." },
  ];
  for (const n of notes) {
    await db.salesNote.upsert({
      where: { id: `demo_${n.key}` },
      update: {},
      create: {
        id: `demo_${n.key}`, companyId: `demo_${n.acct}`, opportunityId: n.opp ? `demo_${n.opp}` : null,
        contactId: n.contact ? `demo_${n.contact}` : null, userId: n.by.id, userName: n.by.name,
        noteDate: at(-n.daysAgo), kind: n.kind, body: n.body, pinned: n.pinned ?? false,
      },
    });
  }

  const tasks: { key: string; acct: string; opp?: string; title: string; due: number; who: { id: string | null; name: string }; priority?: string; done?: boolean }[] = [
    { key: "t1", acct: "harbor", opp: "h1", title: "Get 5-yr support pricing from distributor", due: 1, who: marcus, priority: "High" },
    { key: "t2", acct: "lakeside", opp: "l1", title: "Draft Form 470 support letter", due: -2, who: sandra, priority: "High" },
    { key: "t3", acct: "copper", opp: "c2", title: "Chase landlord roof approval", due: -6, who: alex },
    { key: "t4", acct: "vantage", opp: "v1", title: "Review MSA redlines with legal", due: 3, who: juan, priority: "High" },
    { key: "t5", acct: "orchard", title: "Re-engage regional ops after budget cycle", due: 10, who: marcus },
    { key: "t6", acct: "summit", opp: "s1", title: "Prep council presentation one-pager", due: 12, who: sandra },
    { key: "t7", acct: "harbor", title: "Send QBR recap", due: -1, who: marcus, done: true },
  ];
  for (const t of tasks) {
    await db.salesTask.upsert({
      where: { id: `demo_${t.key}` },
      update: {},
      create: {
        id: `demo_${t.key}`, companyId: `demo_${t.acct}`, opportunityId: t.opp ? `demo_${t.opp}` : null, title: t.title,
        dueDate: at(t.due), priority: t.priority ?? "Normal", assigneeId: t.who.id, assigneeName: t.who.name,
        createdById: t.who.id, createdByName: t.who.name,
        status: t.done ? "Done" : "Open", completedAt: t.done ? at(-1) : null,
      },
    });
  }

  const leads = [
    { key: "ld1", name: "Karen Holt", companyName: "Riverbend Medical Group", title: "IT Manager", email: "kholt@riverbendmed.com", source: "Website", status: "New", owner: null, territory: "Southeast", vertical: "Healthcare", value: 80000, notes: "Filled out contact form asking about Wi-Fi assessments for 4 clinics." },
    { key: "ld2", name: "Jorge Medina", companyName: "Port City Charter Schools", title: "Director of Technology", email: "jmedina@portcitycharter.org", source: "Event", status: "Working", owner: sandra, territory: "Midwest", vertical: "Education", value: 120000, notes: "Met at state ed-tech conference. Wants camera + vape detection pricing." },
    { key: "ld3", name: "Amy Nguyen", companyName: "Granite Peak Resorts", title: "VP Operations", email: "anguyen@granitepeak.com", source: "Referral", status: "Qualified", owner: juan, territory: "West", vertical: "Hospitality", value: 240000, notes: "Referred by Northgate. Budget confirmed for guest network overhaul next spring." },
    { key: "ld4", name: "", companyName: "Delta Freight Partners", title: "", email: "", source: "Cold Outreach", status: "New", owner: null, territory: "West", vertical: "Logistics", value: 0, notes: "" },
  ];
  for (const l of leads) {
    await db.salesLead.upsert({
      where: { id: `demo_${l.key}` },
      update: {},
      create: {
        id: `demo_${l.key}`, name: l.name, companyName: l.companyName, title: l.title, email: l.email, source: l.source,
        status: l.status, ownerId: l.owner?.id ?? null, ownerName: l.owner?.name ?? "", territory: l.territory,
        vertical: l.vertical, estimatedValue: l.value * 100, notes: l.notes,
      },
    });
  }

  console.log(`CRM demo data ready: ${accounts.length} accounts, ${opps.length} opportunities, ${notes.length} notes, ${tasks.length} tasks, ${leads.length} leads.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
