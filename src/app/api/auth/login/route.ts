import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signSession, SESSION_COOKIE } from "@/lib/auth/jwt";
import { toSessionRoleType } from "@/lib/auth/role-mapper";
import type { SessionUser } from "@/lib/auth/types";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // If no password hash is set yet, allow default password "password" for migration period.
    const isValid = user.passwordHash
      ? await verifyPassword(password, user.passwordHash)
      : password === "password";

    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      accountType: user.accountType,
      roleType: toSessionRoleType(user.roleType as string),
    };

    const token = await signSession(sessionUser);
    const response = NextResponse.json({ ok: true, user: sessionUser });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
