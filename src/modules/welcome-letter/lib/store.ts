import { readProjectScoped, writeProjectScoped } from "@/lib/storage/local-store";

const WELCOME_LETTER_KEY = "welcome-letter";

export interface WelcomeLetterRecord {
  subject: string;
  html: string;
  plainText: string;
  sentBy: string;
  sentAt: string; // ISO 8601
}

export async function getWelcomeLetterRecord(projectId: string): Promise<WelcomeLetterRecord | null> {
  return readProjectScoped<WelcomeLetterRecord>(projectId, WELCOME_LETTER_KEY);
}

export async function saveWelcomeLetterRecord(projectId: string, record: WelcomeLetterRecord): Promise<void> {
  writeProjectScoped(projectId, WELCOME_LETTER_KEY, record);
}
