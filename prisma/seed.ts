import { PrismaClient, UserRole, ProjectMemberRole, WorkflowSection, WorkflowStepStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// ─── Users ────────────────────────────────────────────────────────────────────

const SEEDED_AT = new Date("2026-01-01T00:00:00.000Z");

const USERS = [
  {
    id: "user-dana-whitfield",
    name: "Dana Whitfield",
    title: "Project Manager",
    email: "dana.whitfield@nextops.com",
    phone: "(555) 201-4471",
    role: UserRole.ProjectManager,
  },
  {
    id: "user-marcus-reed",
    name: "Marcus Reed",
    title: "Solutions Executive",
    email: "marcus.reed@nextops.com",
    phone: "(555) 201-7732",
    role: UserRole.Member,
  },
  {
    id: "user-priya-subramaniam",
    name: "Priya Subramaniam",
    title: "Solutions Engineer",
    email: "priya.subramaniam@nextops.com",
    phone: "(555) 201-9015",
    role: UserRole.Member,
  },
  {
    id: "user-carlos-ibarra",
    name: "Carlos Ibarra",
    title: "Lead Technician",
    email: "carlos.ibarra@nextops.com",
    phone: "(555) 201-3360",
    role: UserRole.Member,
  },
  {
    id: "user-juan-lazo",
    name: "Juan Lazo",
    title: "Administrator",
    email: "jlazo@mason247.com",
    phone: "(555) 201-1100",
    role: UserRole.Administrator,
  },
  {
    id: "user-sandra-verissimo",
    name: "Sandra Verissimo",
    title: "Sr. Inside Project Manager",
    email: "sverissimo@mason247.com",
    phone: "(555) 201-5588",
    role: UserRole.Member,
  },
  {
    id: "user-alex-behan",
    name: "Alex Behan",
    title: "Inside Project Manager",
    email: "abehan@mason247.com",
    phone: "(555) 201-6694",
    role: UserRole.Member,
  },
] as const;

// ─── Sample Project ───────────────────────────────────────────────────────────

const SAMPLE_PROJECT = {
  id: "proj-iat-anaheim",
  name: "IAT Anaheim",
  projectNumber: "26-1054",
  customerName: "IAT Insurance",
  siteAddress: "1201 N. Anaheim Blvd, Anaheim, CA 92801",
  coordinatorGroup: "Project Coordination Team",
  contractValue: 184000,
  grossProfit: 40480,
  targetCompletionDate: new Date("2026-06-30T00:00:00.000Z"),
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
} as const;

const SAMPLE_PROJECT_MEMBERS = [
  { userId: "user-marcus-reed",        role: ProjectMemberRole.SolutionsExecutive },
  { userId: "user-priya-subramaniam",  role: ProjectMemberRole.SolutionsEngineer },
  { userId: "user-carlos-ibarra",      role: ProjectMemberRole.LeadTechnician },
  { userId: "user-dana-whitfield",     role: ProjectMemberRole.FieldProjectManager },
] as const;

// ─── Workflow Steps ───────────────────────────────────────────────────────────
//
// Weights are computed from PHASE_WEIGHT budgets (setup:15, engineering:15,
// procurement:20, implementation:45, closeout:5) spread evenly across non-exempt steps.
// opportunityWon and projectCreated are weight-exempt (pinned to 0).
//
// setup auto-steps:        4  → 15 / 4 = 3.75 each
// engineering steps:       2  → 15 / 2 = 7.5 each
// procurement steps:       1  → 20 / 1 = 20
// implementation steps:    3  → 45 / 3 = 15 each
// closeout steps:          1  → 5 / 1 = 5

type SeedWorkflowStep = {
  id: string;
  key: string;
  name: string;
  section: WorkflowSection;
  weight: number;
  weightOverridden: boolean;
  sortOrder: number;
  status: WorkflowStepStatus;
  ownerId: string | null;
  dueDate: Date | null;
  completedDate: Date | null;
  updatedAt: Date;
};

const pid = SAMPLE_PROJECT.id;

const SAMPLE_WORKFLOW_STEPS: SeedWorkflowStep[] = [
  {
    id: `${pid}:opportunityWon`,
    key: "opportunityWon",
    name: "Opportunity Won",
    section: WorkflowSection.setup,
    weight: 0,
    weightOverridden: true,
    sortOrder: 1,
    status: WorkflowStepStatus.Complete,
    ownerId: "user-marcus-reed",
    dueDate: new Date("2025-12-10T00:00:00.000Z"),
    completedDate: new Date("2025-12-10T00:00:00.000Z"),
    updatedAt: new Date("2025-12-10T00:00:00.000Z"),
  },
  {
    id: `${pid}:projectCreated`,
    key: "projectCreated",
    name: "Project Created",
    section: WorkflowSection.setup,
    weight: 0,
    weightOverridden: true,
    sortOrder: 2,
    status: WorkflowStepStatus.Complete,
    ownerId: "user-dana-whitfield",
    dueDate: new Date("2026-01-01T00:00:00.000Z"),
    completedDate: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: `${pid}:assignTeam`,
    key: "assignTeam",
    name: "Assign Team",
    section: WorkflowSection.setup,
    weight: 3.75,
    weightOverridden: false,
    sortOrder: 3,
    status: WorkflowStepStatus.Complete,
    ownerId: "user-dana-whitfield",
    dueDate: new Date("2026-01-05T00:00:00.000Z"),
    completedDate: new Date("2026-01-05T00:00:00.000Z"),
    updatedAt: new Date("2026-01-05T00:00:00.000Z"),
  },
  {
    id: `${pid}:sendWelcomeLetter`,
    key: "sendWelcomeLetter",
    name: "Send Welcome Letter",
    section: WorkflowSection.setup,
    weight: 3.75,
    weightOverridden: false,
    sortOrder: 4,
    status: WorkflowStepStatus.Complete,
    ownerId: "user-dana-whitfield",
    dueDate: new Date("2026-01-08T00:00:00.000Z"),
    completedDate: new Date("2026-01-08T00:00:00.000Z"),
    updatedAt: new Date("2026-01-08T00:00:00.000Z"),
  },
  {
    id: `${pid}:scheduleInternalKickoff`,
    key: "scheduleInternalKickoff",
    name: "Schedule Internal Kickoff",
    section: WorkflowSection.setup,
    weight: 3.75,
    weightOverridden: false,
    sortOrder: 5,
    status: WorkflowStepStatus.Complete,
    ownerId: "user-dana-whitfield",
    dueDate: new Date("2026-01-12T00:00:00.000Z"),
    completedDate: new Date("2026-01-12T00:00:00.000Z"),
    updatedAt: new Date("2026-01-12T00:00:00.000Z"),
  },
  {
    id: `${pid}:scheduleTechnicalKickoff`,
    key: "scheduleTechnicalKickoff",
    name: "Schedule Technical Kickoff",
    section: WorkflowSection.setup,
    weight: 3.75,
    weightOverridden: false,
    sortOrder: 6,
    status: WorkflowStepStatus.Complete,
    ownerId: "user-priya-subramaniam",
    dueDate: new Date("2026-01-15T00:00:00.000Z"),
    completedDate: new Date("2026-01-15T00:00:00.000Z"),
    updatedAt: new Date("2026-01-15T00:00:00.000Z"),
  },
  {
    id: `${pid}:cadReview`,
    key: "cadReview",
    name: "CAD Review",
    section: WorkflowSection.engineering,
    weight: 7.5,
    weightOverridden: false,
    sortOrder: 7,
    status: WorkflowStepStatus.NotStarted,
    ownerId: null,
    dueDate: null,
    completedDate: null,
    updatedAt: SEEDED_AT,
  },
  {
    id: `${pid}:bomReview`,
    key: "bomReview",
    name: "BOM Review",
    section: WorkflowSection.engineering,
    weight: 7.5,
    weightOverridden: false,
    sortOrder: 8,
    status: WorkflowStepStatus.InProgress,
    ownerId: "user-priya-subramaniam",
    dueDate: new Date("2026-02-01T00:00:00.000Z"),
    completedDate: null,
    updatedAt: new Date("2026-01-20T00:00:00.000Z"),
  },
  {
    id: `${pid}:equipmentTracking`,
    key: "equipmentTracking",
    name: "Equipment Tracking",
    section: WorkflowSection.procurement,
    weight: 20,
    weightOverridden: false,
    sortOrder: 9,
    status: WorkflowStepStatus.NotStarted,
    ownerId: null,
    dueDate: null,
    completedDate: null,
    updatedAt: SEEDED_AT,
  },
  {
    id: `${pid}:installation`,
    key: "installation",
    name: "Installation",
    section: WorkflowSection.implementation,
    weight: 15,
    weightOverridden: false,
    sortOrder: 10,
    status: WorkflowStepStatus.NotStarted,
    ownerId: null,
    dueDate: null,
    completedDate: null,
    updatedAt: SEEDED_AT,
  },
  {
    id: `${pid}:programming`,
    key: "programming",
    name: "Programming",
    section: WorkflowSection.implementation,
    weight: 15,
    weightOverridden: false,
    sortOrder: 11,
    status: WorkflowStepStatus.NotStarted,
    ownerId: null,
    dueDate: null,
    completedDate: null,
    updatedAt: SEEDED_AT,
  },
  {
    id: `${pid}:commissioning`,
    key: "commissioning",
    name: "Commissioning",
    section: WorkflowSection.implementation,
    weight: 15,
    weightOverridden: false,
    sortOrder: 12,
    status: WorkflowStepStatus.NotStarted,
    ownerId: null,
    dueDate: null,
    completedDate: null,
    updatedAt: SEEDED_AT,
  },
  {
    id: `${pid}:closeout`,
    key: "closeout",
    name: "Closeout",
    section: WorkflowSection.closeout,
    weight: 5,
    weightOverridden: false,
    sortOrder: 13,
    status: WorkflowStepStatus.NotStarted,
    ownerId: null,
    dueDate: null,
    completedDate: null,
    updatedAt: SEEDED_AT,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding database...");

  const defaultPasswordHash = await bcrypt.hash("password", 12);

  // Users — upsert by stable ID so re-running seed is safe
  for (const user of USERS) {
    await db.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        title: user.title,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: true,
        // Only set hash if not already set — preserves user-changed passwords on re-seed.
        ...(await db.user.findUnique({ where: { id: user.id } }).then((u) => u?.passwordHash ? {} : { passwordHash: defaultPasswordHash })),
      },
      create: {
        id: user.id,
        name: user.name,
        title: user.title,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: true,
        passwordHash: defaultPasswordHash,
        createdAt: SEEDED_AT,
      },
    });
  }
  console.log(`  ✓ ${USERS.length} users`);

  // Customer
  const customer = await db.customer.upsert({
    where: { id: "customer-iat-insurance" },
    update: { name: "IAT Insurance" },
    create: { id: "customer-iat-insurance", name: "IAT Insurance" },
  });
  console.log(`  ✓ customer: ${customer.name}`);

  // Project
  await db.project.upsert({
    where: { id: SAMPLE_PROJECT.id },
    update: {
      name: SAMPLE_PROJECT.name,
      contractValue: SAMPLE_PROJECT.contractValue,
      grossProfit: SAMPLE_PROJECT.grossProfit,
      targetCompletionDate: SAMPLE_PROJECT.targetCompletionDate,
      customerId: customer.id,
      solutionsExecutiveId: "user-marcus-reed",
      solutionsEngineerId: "user-priya-subramaniam",
      leadTechnicianId: "user-carlos-ibarra",
      fieldProjectManagerId: "user-dana-whitfield",
    },
    create: {
      ...SAMPLE_PROJECT,
      customerId: customer.id,
      solutionsExecutiveId: "user-marcus-reed",
      solutionsEngineerId: "user-priya-subramaniam",
      leadTechnicianId: "user-carlos-ibarra",
      fieldProjectManagerId: "user-dana-whitfield",
    },
  });
  console.log(`  ✓ project: ${SAMPLE_PROJECT.name}`);

  // Project members — upsert by (projectId, role) unique constraint
  for (const member of SAMPLE_PROJECT_MEMBERS) {
    await db.projectMember.upsert({
      where: {
        projectId_role: {
          projectId: SAMPLE_PROJECT.id,
          role: member.role,
        },
      },
      update: { userId: member.userId },
      create: {
        projectId: SAMPLE_PROJECT.id,
        userId: member.userId,
        role: member.role,
      },
    });
  }
  console.log(`  ✓ ${SAMPLE_PROJECT_MEMBERS.length} project members`);

  // Workflow steps — upsert by stable ID
  for (const step of SAMPLE_WORKFLOW_STEPS) {
    await db.workflowStep.upsert({
      where: { id: step.id },
      update: {
        status: step.status,
        ownerId: step.ownerId,
        dueDate: step.dueDate,
        completedDate: step.completedDate,
        weight: step.weight,
        weightOverridden: step.weightOverridden,
      },
      create: {
        id: step.id,
        projectId: SAMPLE_PROJECT.id,
        key: step.key,
        name: step.name,
        section: step.section,
        weight: step.weight,
        weightOverridden: step.weightOverridden,
        sortOrder: step.sortOrder,
        status: step.status,
        ownerId: step.ownerId,
        dueDate: step.dueDate,
        completedDate: step.completedDate,
        statusOverridden: false,
        isCustom: false,
        updatedAt: step.updatedAt,
      },
    });
  }
  console.log(`  ✓ ${SAMPLE_WORKFLOW_STEPS.length} workflow steps`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
