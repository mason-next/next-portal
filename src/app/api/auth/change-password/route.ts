import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signSession, SESSION_COOKIE } from "@/lib/auth/jwt";
import type { SessionUser } from "@/lib/auth/types";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { newPassword } = body;
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const hash = await hashPassword(newPassword);

  await db.user.update({
    where: { id: session.id },
    data: {
      passwordHash: hash,
      mustChangePassword: false,
    },
  });

  // Issue a fresh JWT without the mustChangePassword flag.
  const updatedSession: SessionUser = {
    id: session.id,
    name: session.name,
    email: session.email,
    roleTypes: session.roleTypes,
    mustChangePassword: false,
  };
  const token = await signSession(updatedSession);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
