import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";
import type { SessionUser } from "@/lib/auth/types";
import {
  hasModulePermission,
  canLevelEdit,
  getEffectiveLevel,
  type ModuleKey,
  type ModuleAction,
  type ModulePermLevel,
} from "@/lib/module-permissions";
import { VIEW_AS_COOKIE } from "@/lib/view-as/ViewAsContext";

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * The session to authorize against. When an Administrator has an active View As
 * session, this returns the VIEWED user (identity + roleTypes), so the app scopes
 * data as — and attributes writes to — that user (true impersonation).
 *
 * SECURITY: the view-as cookie is a plaintext user id and is client-sendable
 * (httpOnly only stops JS reads, not a forged request). It is therefore honored
 * ONLY when the real, JWT-verified session is an Administrator. A non-admin who
 * forges the cookie just gets their own identity back — no privilege escalation.
 */
export async function getEffectiveSession(): Promise<SessionUser | null> {
  const real = await getServerSession();
  if (!real) return null;
  if (!real.roleTypes.includes("Administrator")) return real;
  const jar = await cookies();
  const targetId = jar.get(VIEW_AS_COOKIE)?.value;
  if (!targetId) return real;
  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, name: true, email: true, roleTypes: true, isActive: true },
  });
  if (!target || !target.isActive) return real;
  return { id: target.id, name: target.name, email: target.email ?? "", roleTypes: target.roleTypes };
}

/** Throws if the user lacks member-level (or higher) access on the projects module. */
export async function requireEditPermission(): Promise<void> {
  const session = await getEffectiveSession();
  if (!session) throw new ForbiddenError("You must be signed in to perform this action");
  const level = getEffectiveLevel(session.roleTypes, "projects");
  if (!canLevelEdit(level)) throw new ForbiddenError("You don't have permission to edit this");
}

/** Throws if the effective user does not have the Administrator role type. */
export async function requireAdmin(): Promise<void> {
  const session = await getEffectiveSession();
  if (!session) throw new ForbiddenError("You must be signed in to perform this action");
  if (!session.roleTypes.includes("Administrator")) {
    throw new ForbiddenError("Administrator access required");
  }
}

// ─── Sales row-level scope ──────────────────────────────────────────────────────
// Sales data is exposed via Server Actions (RPC endpoints), so "self-only" visibility
// must be enforced here on the server — never trust a client-supplied owner filter.

export interface SalesScope {
  session: SessionUser;
  level: ModulePermLevel;
  /** administrator level → may see and act on every record (Administrator + Management). */
  canSeeAll: boolean;
  /** member or administrator → may create/edit. */
  canEdit: boolean;
  /** The caller's own owner key — the filter applied to every read for non-admins. */
  userName: string;
  userId: string;
}

/**
 * Resolves the caller's visibility/mutation scope for a sales module.
 * Fails closed: throws if unauthenticated or the effective level is "none".
 * Non-administrator callers are limited to their own records (userName/userId);
 * administrators (the Administrator role type, and Management via the default role
 * config) get canSeeAll. Uses the built-in role defaults, matching the rest of this
 * module's server-side checks.
 */
export async function resolveSalesScope(module: ModuleKey): Promise<SalesScope> {
  const session = await getEffectiveSession();
  if (!session) throw new ForbiddenError("You must be signed in to perform this action");
  const level = getEffectiveLevel(session.roleTypes, module);
  if (level === "none") throw new ForbiddenError("You do not have access to this feature");
  return {
    session,
    level,
    canSeeAll: level === "administrator",
    canEdit: canLevelEdit(level),
    userName: session.name,
    userId: session.id,
  };
}

/** Like resolveSalesScope, but also enforces edit rights (member+). */
export async function resolveSalesWriteScope(module: ModuleKey): Promise<SalesScope> {
  const scope = await resolveSalesScope(module);
  if (!scope.canEdit) throw new ForbiddenError("You don't have permission to modify sales records");
  return scope;
}

/** Throws if the effective user cannot perform the given action on the given module. */
export async function requireModuleAction(
  module: ModuleKey,
  action: ModuleAction
): Promise<void> {
  const session = await getEffectiveSession();
  if (!session) throw new ForbiddenError("You must be signed in to perform this action");
  if (!hasModulePermission(session.roleTypes, module, action)) {
    throw new ForbiddenError(`You do not have permission to ${action} in ${module}`);
  }
}
