// Extracted from activity.ts to break the circular import:
//   activity.ts → projects.ts → activity.ts
// projects.ts needs logProjectActivity, activity.ts needs getProject (from projects.ts).
// Putting logProjectActivity here lets both import from this file without cycling.

import {
  Prisma,
  ActivityCategory as PrismaCategory,
  type ProjectActivity as PrismaActivity,
} from "@prisma/client";
import { db } from "@/lib/db";
import type { ActivityCategory, ActivityTag, ProjectActivity, RichContent } from "@/types/activity";

export function toActivity(p: PrismaActivity): ProjectActivity {
  return {
    id: p.id,
    projectId: p.projectId,
    category: p.category as unknown as ActivityCategory,
    activityType: p.activityType,
    userId: p.userId,
    userName: p.userName,
    message: p.message,
    richContent: p.richContent != null ? (p.richContent as RichContent) : undefined,
    metadata: p.metadata != null ? (p.metadata as Record<string, unknown>) : undefined,
    tag: ((p.tag ?? "General") as ActivityTag),
    pinned: (p as unknown as { pinned?: boolean }).pinned ?? false,
    createdAt: p.createdAt.toISOString(),
  };
}

export interface LogActivityInput {
  category: ActivityCategory;
  activityType: string;
  userName: string;
  userId?: string | null;
  message: string;
  richContent?: RichContent;
  metadata?: Record<string, unknown>;
}

export async function logProjectActivity(
  projectId: string,
  input: LogActivityInput
): Promise<ProjectActivity> {
  const row = await db.projectActivity.create({
    data: {
      projectId,
      category: input.category as unknown as PrismaCategory,
      activityType: input.activityType,
      userId: input.userId ?? null,
      userName: input.userName,
      message: input.message,
      richContent: (input.richContent ?? undefined) as Prisma.InputJsonValue | undefined,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  return toActivity(row);
}
