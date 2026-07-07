import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { getMeetingNotes, createMeetingNote } from "@/lib/data/meeting-notes";
import { ForbiddenError } from "@/lib/access-control";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { projectId } = await params;
  const notes = await getMeetingNotes(projectId);
  return NextResponse.json(notes);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { projectId } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.meetingDate) {
    return NextResponse.json({ error: "title and meetingDate are required" }, { status: 400 });
  }
  try {
    const note = await createMeetingNote(projectId, body);
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
