"use server";

import { db } from "@/lib/db";

export interface InternalKickoffRecord {
  subject: string;
  agenda: string;
  attendees: string[]; // emails
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  scheduledBy: string;
  scheduledAt: string; // ISO 8601 — when "Mark Complete" was clicked
}

export async function getInternalKickoffRecord(projectId: string): Promise<InternalKickoffRecord | null> {
  const row = await db.internalKickoff.findUnique({ where: { projectId } });
  if (!row) return null;
  return {
    subject: row.subject,
    agenda: row.agenda,
    attendees: row.attendees,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    scheduledBy: row.scheduledBy,
    scheduledAt: row.scheduledAt.toISOString(),
  };
}

export async function saveInternalKickoffRecord(projectId: string, record: InternalKickoffRecord): Promise<void> {
  const data = {
    subject: record.subject,
    agenda: record.agenda,
    attendees: record.attendees,
    startTime: new Date(record.startTime),
    endTime: new Date(record.endTime),
    scheduledBy: record.scheduledBy,
    scheduledAt: new Date(record.scheduledAt),
  };
  await db.internalKickoff.upsert({
    where: { projectId },
    update: data,
    create: { projectId, ...data },
  });
}
