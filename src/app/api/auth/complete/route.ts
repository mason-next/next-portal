import { NextResponse } from "next/server";
import { auth, isTenantAllowed } from "@/lib/auth/authjs";
import {
  findUserByEntraObjectId,
  findUserByEmail,
  bindEntraIdentity,
  touchLastLogin,
} from "@/lib/data/users";
import { signSession, SESSION_COOKIE } from "@/lib/auth/jwt";
import { toSessionRoleTypes } from "@/lib/auth/role-mapper";
import { isMaintenanceMode, isMasterEmail } from "@/lib/auth/maintenance";
import type { SessionUser } from "@/lib/auth/types";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — mirrors /api/auth/login

// Bridge: Microsoft has authenticated the user (Auth.js session exists). Here NEXT
// authorizes them — look up the Portal user, enforce enrollment/active/maintenance,
// then mint the existing `next-portal-session` cookie so the rest of the app is
// unchanged. NEVER creates a Portal user (no auto-provisioning).
export async function GET(request: Request): Promise<NextResponse> {
  const { origin } = new URL(request.url);

  try {
    const session = await auth();

    // No Microsoft identity → send back to sign in.
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", origin));
    }

    const email = (session.user.email ?? "").toLowerCase().trim();
    const oid = session.user.oid ?? null;
    const tid = session.user.tid ?? null;

    // Defense-in-depth tenant enforcement at the session-mint boundary. The Auth.js
    // signIn callback + single-tenant issuer already reject other tenants; re-check here
    // so a Portal session can never be minted for an out-of-tenant identity.
    if (!isTenantAllowed(tid)) {
      return NextResponse.redirect(new URL("/access-denied", origin));
    }

    // Resolve the Portal user: prefer the immutable Object ID, fall back to email.
    let user = oid ? await findUserByEntraObjectId(oid) : null;
    const matchedByOid = Boolean(user);
    if (!user && email) {
      user = await findUserByEmail(email);
    }

    const u = user as
      | {
          id: string;
          name: string;
          email: string;
          isActive?: boolean;
          roleTypes?: string[];
          accountType?: string;
          roleType?: string;
          mustChangePassword?: boolean;
          entraObjectId?: string | null;
        }
      | null;

    // Authenticated with Microsoft but no active Portal account → access denied.
    // Do NOT auto-provision. Enrollment stays on the Users admin page. `!u.isActive`
    // fails closed (denies) for inactive, null, or missing status.
    if (!u || !u.isActive) {
      return NextResponse.redirect(new URL("/access-denied", origin));
    }

    // Identity-takeover guard: if we fell back to email matching but this Portal user is
    // already bound to a DIFFERENT Microsoft Object ID, refuse. Email matching must never
    // silently rebind an account to a new Microsoft identity (e.g. a reassigned mailbox).
    // An admin must "Reset Microsoft Login" first to allow a deliberate re-bind.
    if (!matchedByOid && u.entraObjectId && u.entraObjectId !== oid) {
      return NextResponse.redirect(new URL("/access-denied", origin));
    }

    // Emergency maintenance lockout still applies to the Microsoft path.
    if (isMaintenanceMode() && !isMasterEmail(u.email)) {
      return NextResponse.redirect(new URL("/login?locked=1", origin));
    }

    // First login (email match, no OID yet) → permanently bind the Entra identity.
    // Returning login (OID match) → just refresh the timestamp; never rebind.
    if (oid && !matchedByOid) {
      await bindEntraIdentity(u.id, oid, tid);
    } else {
      await touchLastLogin(u.id);
    }

    // Build the Portal session (identical shape to password login) and mint the cookie.
    const roleTypes =
      u.roleTypes && u.roleTypes.length > 0
        ? u.roleTypes
        : toSessionRoleTypes(u.accountType, u.roleType);

    const sessionUser: SessionUser = {
      id: u.id,
      name: u.name,
      email: u.email,
      roleTypes,
      mustChangePassword: u.mustChangePassword === true,
    };

    const token = await signSession(sessionUser);
    const response = NextResponse.redirect(new URL("/projects", origin));
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  } catch (err) {
    // Never leak token/identity details; log a generic marker only.
    console.error("[auth/complete] failed to establish Portal session");
    void err;
    return NextResponse.redirect(new URL("/login?error=signin", origin));
  }
}
