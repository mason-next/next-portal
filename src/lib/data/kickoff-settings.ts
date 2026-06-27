"use server";

import { db } from "@/lib/db";

const DEFAULT_KICKOFF_ATTENDEES_KEY = "default-kickoff-attendee-ids";

// Preserves the original hardcoded Sandra Verissimo / Alex Behan standing-attendee behavior for
// installs that haven't yet visited Admin to customize this list.
const FALLBACK_DEFAULT_ATTENDEE_IDS = ["user-sandra-verissimo", "user-alex-behan"];

export async function getDefaultKickoffAttendeeIds(): Promise<string[]> {
  const row = await db.appSetting.findUnique({ where: { key: DEFAULT_KICKOFF_ATTENDEES_KEY } });
  if (!row) return FALLBACK_DEFAULT_ATTENDEE_IDS;
  return Array.isArray(row.value) ? (row.value as string[]) : FALLBACK_DEFAULT_ATTENDEE_IDS;
}

export async function setDefaultKickoffAttendeeIds(ids: string[]): Promise<void> {
  await db.appSetting.upsert({
    where: { key: DEFAULT_KICKOFF_ATTENDEES_KEY },
    update: { value: ids },
    create: { key: DEFAULT_KICKOFF_ATTENDEES_KEY, value: ids },
  });
}
