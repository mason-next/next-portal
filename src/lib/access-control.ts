import { getServerSession } from "@/lib/auth/server";
import {
  hasModulePermission,
  canLevelEdit,
  getEffectiveLevel,
  type ModuleKey,
  type ModuleAction,
} from "@/lib/module-permissions";

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Throws if the user lacks member-level (or higher) access on the projects module. */
export async function requireEditPermission(): Promise<void> {
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

/** Throws if the user cannot perform the given action on the given module. */
export async function requireModuleAction(
  module: ModuleKey,
  action: ModuleAction
): Promise<void> {
  const session = await getServerSession();
  if (!session) throw new ForbiddenError("You must be signed in to perform this action");
  if (!hasModulePermission(session.roleTypes, module, action)) {
    throw new ForbiddenError(`You do not have permission to ${action} in ${module}`);
  }
}
