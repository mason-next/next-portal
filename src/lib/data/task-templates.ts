"use server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";
import { requireEditPermission } from "@/lib/access-control";
import { getProjectTasks } from "@/lib/data/implementation";
import type { ImplementationTask } from "@/types/implementation";

export interface TaskTemplate {
  title: string;
  description?: string;
  subtasks?: string[];
}

// Predefined task templates keyed by workflow step key.
// Each task has an optional list of subtask titles.
export const STEP_TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  installation: [
    {
      title: "Pre-Install Walkthrough",
      description: "Confirm onsite conditions, routing paths, and identify any infrastructure gaps before installation begins.",
      subtasks: [
        "Review engineering packet and drawings",
        "Confirm rack locations and mounting surfaces",
        "Identify cable routing paths",
        "Verify power and data infrastructure",
        "Document any deviations from plan",
      ],
    },
    {
      title: "Equipment Staging & Verification",
      description: "Verify all delivered equipment against the BOM before installation begins.",
      subtasks: [
        "Check all items against BOM",
        "Inspect for damage or defects",
        "Stage equipment at install location",
        "Document any missing or damaged items",
      ],
    },
    {
      title: "Cable Pull & Rough-In",
      description: "Pull all signal, power, and control cabling per the pull schedule and drawings.",
      subtasks: [
        "Pull low-voltage signal cables",
        "Pull control system cables",
        "Label cables per drawing conventions",
        "Conduct continuity testing on pulled cables",
      ],
    },
    {
      title: "Rack Build & Equipment Mounting",
      description: "Build and dress the equipment rack; mount all field devices per drawings.",
      subtasks: [
        "Mount rack hardware and panels",
        "Install and dress rack equipment",
        "Mount field devices (displays, speakers, cameras, etc.)",
        "Apply equipment labels",
      ],
    },
    {
      title: "Cable Termination & Patching",
      description: "Terminate all cables at rack and field endpoints; complete patch bay connections.",
      subtasks: [
        "Terminate rack-end connections",
        "Terminate field-end connections",
        "Complete patch panel wiring",
        "Verify all terminations",
      ],
    },
    {
      title: "Network & IT Configuration",
      description: "Configure network switches, assign IP addresses per IP scope, and verify connectivity.",
      subtasks: [
        "Configure managed switches per IP scope",
        "Assign static IPs to AV devices",
        "Verify VLAN assignments",
        "Test network connectivity for all devices",
      ],
    },
  ],
  programming: [
    {
      title: "Functional Narrative Review",
      description: "Review the approved functional narrative to confirm programming requirements before coding begins.",
      subtasks: [
        "Review system functions and user workflows",
        "Confirm GUI design and interface expectations",
        "Identify programming dependencies",
        "Confirm approval before proceeding",
      ],
    },
    {
      title: "Control System Programming",
      description: "Program the control system processor per the functional narrative.",
      subtasks: [
        "Build room logic and source routing",
        "Program device control commands",
        "Implement scheduling and presets",
        "Internal review and testing",
      ],
    },
    {
      title: "GUI Development",
      description: "Build touchpanel and/or software interfaces per approved UX mockups.",
      subtasks: [
        "Build main room control page",
        "Build source selection and display control",
        "Build audio/volume controls",
        "Apply approved branding and color scheme",
        "User acceptance review",
      ],
    },
    {
      title: "DSP & Audio Configuration",
      description: "Configure digital signal processing, routing, and audio presets.",
      subtasks: [
        "Configure input/output routing",
        "Set gain structure and levels",
        "Configure acoustic echo cancellation",
        "Save and document presets",
      ],
    },
    {
      title: "AV-over-IP / Video Distribution Setup",
      description: "Configure video distribution, encoders, decoders, and routing matrix as applicable.",
      subtasks: [
        "Configure encoders and decoders",
        "Set up video routing",
        "Test signal quality on all outputs",
      ],
    },
    {
      title: "Integration & End-to-End Testing",
      description: "Test all system functions together to confirm integrated behavior matches the functional narrative.",
      subtasks: [
        "Test all source selection and routing",
        "Test room presets and scheduling",
        "Test control system to DSP communication",
        "Test remote control and scheduling",
        "Document all issues found",
      ],
    },
  ],
  commissioning: [
    {
      title: "System Power-Up & Device Verification",
      description: "Power up all equipment and verify each device is online and communicating.",
      subtasks: [
        "Power on all rack equipment",
        "Verify all devices are reachable on network",
        "Confirm firmware versions match engineering packet",
        "Resolve any offline or unreachable devices",
      ],
    },
    {
      title: "Audio/Video Signal Path Testing",
      description: "Verify signal flow for all sources and destinations per the functional narrative.",
      subtasks: [
        "Test each video source to all outputs",
        "Test audio signal routing and levels",
        "Verify mic mixing and echo cancellation",
        "Confirm video conferencing A/V quality",
      ],
    },
    {
      title: "Control System Verification",
      description: "Verify all control system commands and feedback work as programmed.",
      subtasks: [
        "Test all touchpanel buttons and feedback",
        "Test room presets and scene recall",
        "Verify scheduling functions",
        "Test all connected device control",
      ],
    },
    {
      title: "Punch List Resolution",
      description: "Document and resolve all issues found during commissioning before customer walkthrough.",
      subtasks: [
        "Compile punch list from commissioning testing",
        "Assign and resolve all punch items",
        "Re-test resolved items",
        "Confirm punch list is clear",
      ],
    },
    {
      title: "Customer Walkthrough & Acceptance",
      description: "Walk the customer through the completed system and obtain sign-off.",
      subtasks: [
        "Demonstrate full system operation",
        "Review functional narrative with customer",
        "Document any customer change requests",
        "Obtain customer signature/acceptance",
      ],
    },
    {
      title: "Training",
      description: "Train onsite staff on day-to-day system operation.",
      subtasks: [
        "Conduct end-user operation training",
        "Walk through common scenarios and workflows",
        "Provide training documentation or QR guide",
      ],
    },
    {
      title: "As-Built Documentation",
      description: "Finalize as-built drawings, IP scope, and programming files with any field changes noted.",
      subtasks: [
        "Update drawings with field red lines",
        "Finalize IP scope with all device credentials",
        "Upload final programming files",
        "Submit as-built package to Project Engineer",
      ],
    },
    {
      title: "Final Day Photos",
      description: "Photograph completed installation for project records.",
      subtasks: [
        "Photograph rack front and rear",
        "Photograph all field device installations",
        "Photograph cable dressing",
        "Upload photos to project folder",
      ],
    },
  ],
};

export async function seedStepTasks(
  projectId: string,
  workflowStepId: string,
  stepKey: string
): Promise<{ created: number; skipped: boolean }> {
  await requireEditPermission();
  const session = await getServerSession();

  const templates = STEP_TASK_TEMPLATES[stepKey];
  if (!templates?.length) return { created: 0, skipped: true };

  // Check if tasks already exist for this step to avoid duplicates
  const existing = await db.implementationTask.count({
    where: { projectId, workflowStepId, parentTaskId: null },
  });
  if (existing > 0) return { created: 0, skipped: true };

  // Get current max sortOrder for this project's tasks
  const maxOrder = await db.implementationTask.aggregate({
    where: { projectId, parentTaskId: null },
    _max: { sortOrder: true },
  });
  let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  let created = 0;
  for (const template of templates) {
    const parent = await db.implementationTask.create({
      data: {
        projectId,
        isPersonal: false,
        title: template.title,
        description: template.description ?? "",
        status: "NotStarted",
        priority: "Medium",
        percentComplete: 0,
        createdById: session?.id ?? null,
        workflowStepId,
        sortOrder: nextOrder++,
        notes: "",
        tags: [],
        parentTaskId: null,
      } as Parameters<typeof db.implementationTask.create>[0]["data"],
    });

    if (template.subtasks?.length) {
      let subOrder = 0;
      for (const subtaskTitle of template.subtasks) {
        await db.implementationTask.create({
          data: {
            projectId,
            isPersonal: false,
            title: subtaskTitle,
            description: "",
            status: "NotStarted",
            priority: "Medium",
            percentComplete: 0,
            createdById: session?.id ?? null,
            workflowStepId,
            sortOrder: subOrder++,
            notes: "",
            tags: [],
            parentTaskId: parent.id,
          } as Parameters<typeof db.implementationTask.create>[0]["data"],
        });
      }
    }
    created++;
  }

  return { created, skipped: false };
}
