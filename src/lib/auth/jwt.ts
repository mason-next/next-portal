import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { SessionUser } from "./types";
import type { AccountType } from "@/types/user";
import { toSessionRoleType } from "./role-mapper";

const SESSION_COOKIE = "next-portal-session";
const EXPIRY_DAYS = 30;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET environment variable must be set in production");
    }
    return new TextEncoder().encode("dev-secret-change-in-production-min-32-chars");
  }
  return new TextEncoder().encode(secret);
}

export { SESSION_COOKIE };

interface SessionPayload extends JWTPayload {
  id: string;
  name: string;
  email: string;
  accountType?: string;
  roleType?: string;
  // kept for backwards-compat: old sessions issued before the refactor carry `role`.
  role?: string;
}

export async function signSession(user: SessionUser): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + EXPIRY_DAYS * 86400;
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    accountType: user.accountType,
    roleType: user.roleType,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecret());
    if (!payload.id || !payload.name || !payload.email) return null;

    // Support old tokens that carried `role` instead of `accountType`.
    const rawAccountType: string | undefined =
      payload.accountType ??
      (payload.role === "Administrator" ? "Administrator" : "Member");

    if (!rawAccountType) return null;

    // Normalize roleType — handles both new values and legacy DB/JWT values.
    const roleType = toSessionRoleType(payload.roleType ?? "Management");

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      accountType: rawAccountType as AccountType,
      roleType,
    };
  } catch {
    return null;
  }
}
