import { cookies } from "next/headers";
import { getServerSession } from "@/lib/auth/server";
import {
  hasModulePermission,
  canLevelEdit,
  getEffectiveLevel,
  type ModuleKey,
  type ModuleAction,
} from "@/lib/module-permissions";
import { VIEW_AS_COOKIE } from "@/lib/view-as/ViewAsContext";

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Throws if a View As session is currently active. Call at the start of any mutation. */
export async function requireNotViewAsMode(): Promise<void> {
  const cookieStore = await cookies();
  if (cookieStore.get(VIEW_AS_COOKIE)?.value) {
    throw new ForbiddenError("Write operations are disabled during View As preview mode");
  }
}

/** Throws if the user lacks member-level (or higher) access on the projects module. */
export async function requireEditPermission(): Promise<void> {
  await requireNotViewAsMode();
  const session = await getServerSession();
  if (!session) throw new ForbiddenError("You must be signed in to perform this action");
  const level = getEffectiveLevel(session.roleTypes, "projects");
  if (!canLevelEdit(level)) throw new ForbiddenError("You don't have permission to edit this");
}

/** Throws if the user does not have the Administrator role type. */
export async function requireAdmin(): Promise<void> {
  const session = await getServerSession();
  if (!session) throw new ForbiddenError("You must be signed in to perform this action");
  if (!session.roleTypes.includes("Administrator")) {
    throw new ForbiddenError("Administrator access required");
  }
}

const WRITE_ACTIONS = new Set<ModuleAction>(["create", "edit", "delete", "approve", "assign", "manageSettings"]);

/** Throws if the user cannot perform the given action on the given module. */
export async function requireModuleAction(
  module: ModuleKey,
  action: ModuleAction
): Promise<void> {
  if (WRITE_ACTIONS.has(action)) await requireNotViewAsMode();
  const session = await getServerSession();
  if (!session) throw new ForbiddenError("You must be signed in to perform this action");
  if (!hasModulePermission(session.roleTypes, module, action)) {
    throw new ForbiddenError(`You do not have permission to ${action} in ${module}`);
  }
}
