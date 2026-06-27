"use server";

import { db } from "@/lib/db";

export interface WelcomeLetterRecord {
  subject: string;
  html: string;
  plainText: string;
  sentBy: string;
  sentAt: string; // ISO 8601
}

export async function getWelcomeLetterRecord(projectId: string): Promise<WelcomeLetterRecord | null> {
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
