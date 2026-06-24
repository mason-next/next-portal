import { readProjectScoped, writeProjectScoped } from "@/lib/storage/local-store";

export interface InternalKickoffRecord {
  subject: string;
  agenda: string;
  attendees: string[]; // emails
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  scheduledBy: string;
  scheduledAt: string; // ISO 8601 — when "Mark Complete" was clicked
}

const INTERNAL_KICKOFF_KEY = "internal-kickoff";

export async function getInternalKickoffRecord(projectId: string): Promise<InternalKickoffRecord | null> {
  return readProjectScoped<InternalKickoffRecord>(projectId, INTERNAL_KICKOFF_KEY);
}

export async function saveInternalKickoffRecord(projectId: string, record: InternalKickoffRecord): Promise<void> {
  writeProjectScoped(projectId, INTERNAL_KICKOFF_KEY, record);
}
