"use server";

// Central notification service — all notification creation in the app goes through here.
// Business logic is decoupled from delivery: adding a new provider (email, Teams, push) is
// done by registering it in DELIVERY_PROVIDERS below without touching business code.
//
// Current providers: in-app (database), email (provider-agnostic, see EMAIL_PROVIDER env)
// Future providers: Microsoft Teams (Graph API), push (web-push)

import { db } from "@/lib/db";
import { createNotification } from "@/lib/data/notifications";
import { sendNotificationEmail } from "@/lib/email/send-notification-email";
import type { NewNotificationInput } from "@/types/notification";

// ─── Provider contract ────────────────────────────────────────────────────────

type DeliveryProvider = (input: NewNotificationInput) => Promise<void>;

// In-app database provider — always active.
const inAppProvider: DeliveryProvider = async (input) => {
  await createNotification(input);
};

// Email provider — always registered; actual delivery is gated by EMAIL_PROVIDER env var
// (defaults to "disabled" which logs intent without sending). Skips inactive/email-less users.
const emailProvider: DeliveryProvider = async (input) => {
  const recipient = await db.user.findUnique({
    where: { id: input.userId },
    select: { email: true, name: true, isActive: true },
  });
  if (!recipient?.email || !recipient.isActive) return;
  await sendNotificationEmail(input, recipient.email, recipient.name);
};

// Future providers:
// const teamsProvider: DeliveryProvider = async (input) => {
//   await sendTeamsMessage(input);
// };

const DELIVERY_PROVIDERS: DeliveryProvider[] = [
  inAppProvider,
  emailProvider,
  // teamsProvider,   // Phase: Microsoft Teams (Milestone 4)
];

// ─── Core dispatch ────────────────────────────────────────────────────────────

// Fire all providers in parallel; a single provider failure never blocks others.
export async function sendNotification(input: NewNotificationInput): Promise<void> {
  await Promise.all(DELIVERY_PROVIDERS.map((p) => p(input).catch((err) => {
    console.error(`[notification-service] provider failed for type=${input.type}:`, err);
  })));
}

// ─── Convenience helpers for each notification type ───────────────────────────
// These enforce the correct shape per type so call sites stay concise.

export async function notifyMention(params: {
  recipientId: string;
  authorName: string;
  projectId: string;
  projectName: string;
  commentPreview: string;
  // Pass exactly one of these — determines the dedup key and source context.
  commentId?: string;       // project activity comment
  taskCommentId?: string;   // implementation task comment
}): Promise<void> {
  await sendNotification({
    userId: params.recipientId,
    type: "mention",
    projectId: params.projectId,
    projectName: params.projectName,
    commentId: params.commentId ?? null,
    taskCommentId: params.taskCommentId ?? null,
    commentAuthor: params.authorName,
    commentPreview: params.commentPreview,
    message: `${params.authorName} mentioned you in ${params.projectName}`,
  });
}

export async function notifyAssignment(params: {
  recipientId: string;
  assignedBy: string;
  projectId: string;
  projectName: string;
  itemName: string; // e.g. "Installation", "Task: Run wire"
  itemType: "workflow_step" | "task";
  itemId?: string;
}): Promise<void> {
  await sendNotification({
    userId: params.recipientId,
    type: "assignment",
    projectId: params.projectId,
    projectName: params.projectName,
    message: `${params.assignedBy} assigned you to "${params.itemName}" in ${params.projectName}`,
    metadata: { itemName: params.itemName, itemType: params.itemType, itemId: params.itemId },
  });
}

export async function notifyApprovalNeeded(params: {
  recipientId: string;
  requestedBy: string;
  projectId: string;
  projectName: string;
  stepName: string;
  stepId: string;
}): Promise<void> {
  await sendNotification({
    userId: params.recipientId,
    type: "approval_needed",
    projectId: params.projectId,
    projectName: params.projectName,
    message: `${params.requestedBy} needs your approval for "${params.stepName}" in ${params.projectName}`,
    metadata: { stepName: params.stepName, stepId: params.stepId },
  });
}

export async function notifyStatusChange(params: {
  recipientId: string;
  projectId: string;
  projectName: string;
  field: string;
  oldValue: string;
  newValue: string;
}): Promise<void> {
  await sendNotification({
    userId: params.recipientId,
    type: "status_change",
    projectId: params.projectId,
    projectName: params.projectName,
    message: `${params.projectName}: ${params.field} changed from "${params.oldValue}" to "${params.newValue}"`,
    metadata: { field: params.field, oldValue: params.oldValue, newValue: params.newValue },
  });
}

export async function notifyProjectAssigned(params: {
  recipientId: string;
  assignedBy: string;
  projectId: string;
  projectName: string;
  roleName: string;
}): Promise<void> {
  await sendNotification({
    userId: params.recipientId,
    type: "project_assigned",
    projectId: params.projectId,
    projectName: params.projectName,
    message: `${params.assignedBy} added you to "${params.projectName}" as ${params.roleName}`,
    metadata: { roleName: params.roleName },
  });
}

export async function notifyProcurementUpdate(params: {
  recipientId: string;
  projectId: string;
  projectName: string;
  updateMessage: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await sendNotification({
    userId: params.recipientId,
    type: "procurement_update",
    projectId: params.projectId,
    projectName: params.projectName,
    message: params.updateMessage,
    metadata: params.metadata,
  });
}
