export interface MeetingNote {
  id: string;
  projectId: string;
  title: string;
  meetingDate: string; // ISO date string (YYYY-MM-DD)
  attendees: string;
  body: string;
  actionItems: string;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingNoteInput {
  title: string;
  meetingDate: string;
  attendees?: string;
  body?: string;
  actionItems?: string;
}

export interface UpdateMeetingNoteInput {
  title?: string;
  meetingDate?: string;
  attendees?: string;
  body?: string;
  actionItems?: string;
}
