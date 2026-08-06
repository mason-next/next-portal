import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { db } from "@/lib/db";

// POST /api/users/heartbeat
// Updates the current user's lastActiveAt timestamp. Called by the client every 60 s
// while the tab is visible. Lightweight — one indexed write per call.
export async function POST() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await (db.user.update as (args: unknown) => Promise<unknown>)({
    where: { id: session.id },
    data: { lastActiveAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
