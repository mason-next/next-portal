import { readGlobal, writeGlobal } from "@/lib/storage/local-store";

const DEFAULT_KICKOFF_ATTENDEES_KEY = "default-kickoff-attendee-ids";

// Preserves the original hardcoded Sandra Verissimo / Alex Behan standing-attendee behavior for
// installs that haven't yet visited Admin to customize this list.
const FALLBACK_DEFAULT_ATTENDEE_IDS = ["user-sandra-verissimo", "user-alex-behan"];

export async function getDefaultKickoffAttendeeIds(): Promise<string[]> {
  return readGlobal<string[]>(DEFAULT_KICKOFF_ATTENDEES_KEY) ?? FALLBACK_DEFAULT_ATTENDEE_IDS;
}

export async function setDefaultKickoffAttendeeIds(ids: string[]): Promise<void> {
  writeGlobal(DEFAULT_KICKOFF_ATTENDEES_KEY, ids);
}
