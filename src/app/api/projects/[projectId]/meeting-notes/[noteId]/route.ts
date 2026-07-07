import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { updateMeetingNote, deleteMeetingNote } from "@/lib/data/meeting-notes";
import { ForbiddenError } from "@/lib/access-control";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; noteId: string }> }
) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { noteId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const note = await updateMeetingNote(noteId, body);
    return NextResponse.json(note);
  } catch (err) {
    console.error("[PATCH /api/meeting-notes/:noteId] error:", err);
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; noteId: string }> }
) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { noteId } = await params;
  await deleteMeetingNote(noteId);
  return new NextResponse(null, { status: 204 });
}
