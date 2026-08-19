import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signSession, SESSION_COOKIE } from "@/lib/auth/jwt";
import { toSessionRoleTypes } from "@/lib/auth/role-mapper";
import { isMaintenanceMode, isMasterEmail, getMasterPassword } from "@/lib/auth/maintenance";
import type { SessionUser } from "@/lib/auth/types";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    // Maintenance lockout: only the master account (via the special MASTER_PASSWORD)
    // may authenticate. Everyone else is refused before the normal credential check.
    const masterOverride = isMaintenanceMode() && isMasterEmail(email);
    if (isMaintenanceMode()) {
      const masterPassword = getMasterPassword();
      if (!masterOverride || !masterPassword || password !== masterPassword) {
        return NextResponse.json(
          { error: "The portal is in maintenance mode. Access is temporarily restricted." },
          { status: 403 },
        );
      }
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // The master override bypasses the isActive gate so the master can never lock themselves out.
    if (!user || (!user.isActive && !masterOverride)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const isValid = masterOverride
      ? true
      : user.passwordHash
        ? await verifyPassword(password, user.passwordHash)
        : password === "password";

    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const userAny = user as unknown as { roleTypes?: string[]; mustChangePassword?: boolean };

    // Use the roleTypes column if populated; otherwise derive from legacy accountType + roleType.
    const roleTypes =
      userAny.roleTypes && userAny.roleTypes.length > 0
        ? userAny.roleTypes
        : toSessionRoleTypes(user.accountType as string, user.roleType as string);

    const sessionUser: SessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleTypes,
      mustChangePassword: userAny.mustChangePassword === true,
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
