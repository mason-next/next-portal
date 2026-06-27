import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { SessionUser } from "./types";

const SESSION_COOKIE = "next-portal-session";
const EXPIRY_DAYS = 30;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? "dev-secret-change-in-production-min-32-chars";
  return new TextEncoder().encode(secret);
}

export { SESSION_COOKIE };

interface SessionPayload extends JWTPayload {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function signSession(user: SessionUser): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + EXPIRY_DAYS * 86400;
  return new SignJWT({ id: user.id, name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecret());
    if (!payload.id || !payload.name || !payload.email || !payload.role) return null;
    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role as SessionUser["role"],
    };
  } catch {
    return null;
  }
}
