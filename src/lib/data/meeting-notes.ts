"use server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";
import { requireEditPermission } from "@/lib/access-control";
import type { MeetingNote, CreateMeetingNoteInput, UpdateMeetingNoteInput } from "@/types/meeting-notes";

function toNote(p: {
  id: string;
  projectId: string;
  title: string;
  meetingDate: Date;
  attendees: string[];
  body: string;
  actionItems: string;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MeetingNote {
  return {
    id: p.id,
    projectId: p.projectId,
    title: p.title,
    meetingDate: p.meetingDate.toISOString().split("T")[0],
    attendees: p.attendees,
    body: p.body,
    actionItems: p.actionItems,
    createdById: p.createdById,
    createdByName: p.createdByName,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function getMeetingNotes(projectId: string): Promise<MeetingNote[]> {
  const rows = await (db as any).meetingNote.findMany({
    where: { projectId },
    orderBy: { meetingDate: "desc" },
  });
  return rows.map(toNote);
}

export async function createMeetingNote(projectId: string, input: CreateMeetingNoteInput): Promise<MeetingNote> {
  await requireEditPermission();
  const session = await getServerSession();
  const row = await (db as any).meetingNote.create({
    data: {
      projectId,
      title: input.title,
      meetingDate: new Date(input.meetingDate),
      attendees: input.attendees ?? [],
      body: input.body ?? "",
      actionItems: input.actionItems ?? "",
      createdById: session?.id ?? null,
      createdByName: session?.name ?? null,
    },
  });
  return toNote(row);
}

export async function updateMeetingNote(noteId: string, input: UpdateMeetingNoteInput): Promise<MeetingNote> {
  await requireEditPermission();
  const data: Record<string, unknown> = {};
  if (input.title !== undefined)       data.title       = input.title;
  if (input.meetingDate !== undefined) data.meetingDate = new Date(input.meetingDate);
  if (input.attendees !== undefined)   data.attendees   = input.attendees;
  if (input.body !== undefined)        data.body        = input.body;
  if (input.actionItems !== undefined) data.actionItems = input.actionItems;
  const row = await (db as any).meetingNote.update({ where: { id: noteId }, data });
  return toNote(row);
}

export async function deleteMeetingNote(noteId: string): Promise<void> {
  await requireEditPermission();
  await (db as any).meetingNote.delete({ where: { id: noteId } });
}
