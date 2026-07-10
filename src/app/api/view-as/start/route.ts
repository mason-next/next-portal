import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { VIEW_AS_COOKIE } from "@/lib/view-as/ViewAsContext";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.roleTypes.includes("Administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { targetUserId, targetUserName } = (await req.json()) as {
    targetUserId: string;
    targetUserName: string;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).adminAuditLog.create({
    data: {
      adminId: session.id,
      adminName: session.name,
      action: "view_as_start",
      targetUserId,
      targetUserName,
    },
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(VIEW_AS_COOKIE, targetUserId, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    // No maxAge = session cookie, cleared when browser closes
  });
  return response;
}
