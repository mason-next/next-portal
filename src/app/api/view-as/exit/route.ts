import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { VIEW_AS_COOKIE } from "@/lib/view-as/ViewAsContext";

export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const targetUserId = cookieStore.get(VIEW_AS_COOKIE)?.value;

  if (targetUserId && session.roleTypes.includes("Administrator")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).adminAuditLog.create({
      data: {
        adminId: session.id,
        adminName: session.name,
        action: "view_as_exit",
        targetUserId,
      },
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(VIEW_AS_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
