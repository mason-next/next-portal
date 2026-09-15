"use server";

import { db } from "@/lib/db";
import { requireModuleAction, requireEditPermission } from "@/lib/access-control";

export interface WelcomeLetterRecord {
  subject: string;
  html: string;
  plainText: string;
  sentBy: string;
  sentAt: string; // ISO 8601
}

export async function getWelcomeLetterRecord(projectId: string): Promise<WelcomeLetterRecord | null> {
  await requireModuleAction("projects", "view");
  const row = await db.welcomeLetter.findUnique({ where: { projectId } });
  if (!row) return null;
  return {
    subject: row.subject,
    html: row.html,
    plainText: row.plainText,
    sentBy: row.sentBy,
    sentAt: row.sentAt.toISOString(),
  };
}

export async function saveWelcomeLetterRecord(projectId: string, record: WelcomeLetterRecord): Promise<void> {
  await requireEditPermission();
  const data = {
    subject: record.subject,
    html: record.html,
    plainText: record.plainText,
    sentBy: record.sentBy,
    sentAt: new Date(record.sentAt),
  };
  await db.welcomeLetter.upsert({
    where: { projectId },
    update: data,
    create: { projectId, ...data },
  });
}
