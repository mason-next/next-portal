import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./jwt";
import type { SessionUser } from "./types";

// Returns the authenticated user from the session cookie, or null if unauthenticated.
// Call sites that need a guaranteed user (all app pages via middleware) can cast the result;
// pages/server-actions that tolerate anonymous access should handle null explicitly.
//
// To swap auth providers in the future:
//   Entra: validate the Authorization bearer token via MSAL and map JWT claims to SessionUser.
//   Auth.js: replace with `auth()` from next-auth and map the returned session to SessionUser.
// The SessionUser shape is intentionally designed to match Microsoft Entra ID JWT claims:
//   sub → id, name → name, email → upn, extension_role → role
export async function getServerSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

// Convenience: throws if unauthenticated — use in server actions that require auth.
export async function requireSession(): Promise<SessionUser> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthenticated");
  return session;
}
