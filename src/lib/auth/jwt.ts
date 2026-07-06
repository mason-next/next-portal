import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { SessionUser } from "./types";
import { toSessionRoleTypes } from "./role-mapper";

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
  roleTypes?: string[];
  // Legacy fields present in tokens issued before the permissions refactor.
  accountType?: string;
  roleType?: string;
  role?: string;
  mustChangePassword?: boolean;
}

export async function signSession(user: SessionUser): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + EXPIRY_DAYS * 86400;
  const payload: Record<string, unknown> = {
    id: user.id,
    name: user.name,
    email: user.email,
    roleTypes: user.roleTypes,
  };
  if (user.mustChangePassword) payload.mustChangePassword = true;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecret());
    if (!payload.id || !payload.name || !payload.email) return null;

    let roleTypes: string[];
    if (payload.roleTypes && payload.roleTypes.length > 0) {
      roleTypes = payload.roleTypes;
    } else {
      // Backward compat: old tokens carry accountType + roleType instead of roleTypes.
      const legacyAccountType =
        payload.accountType ?? (payload.role === "Administrator" ? "Administrator" : undefined);
      roleTypes = toSessionRoleTypes(legacyAccountType, payload.roleType);
    }

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      roleTypes,
      mustChangePassword: payload.mustChangePassword === true,
    };
  } catch {
    return null;
  }
}
