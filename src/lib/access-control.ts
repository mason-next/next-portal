import { getServerSession } from "@/lib/auth/server";
import {
  hasModulePermission,
  type ModuleKey,
  type ModuleAction,
} from "@/lib/module-permissions";

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// Throws ForbiddenError if the session user is a Viewer or unauthenticated.
// Call at the top of any server action that modifies data.
export async function requireEditPermission(): Promise<void> {
  const session = await getServerSession();
  if (!session) throw new ForbiddenError("You must be signed in to perform this action");
  if (session.accountType === "Viewer") throw new ForbiddenError("You don't have permission to edit this");
}

// Throws ForbiddenError if the session user is not an Administrator.
export async function requireAdmin(): Promise<void> {
  const session = await getServerSession();
  if (!session) throw new ForbiddenError("You must be signed in to perform this action");
  if (session.accountType !== "Administrator") throw new ForbiddenError("Administrator access required");
}

// Throws ForbiddenError if the session user cannot perform the given action on the given module.
export async function requireModuleAction(
  module: ModuleKey,
  action: ModuleAction
): Promise<void> {
  const session = await getServerSession();
  if (!session) throw new ForbiddenError("You must be signed in to perform this action");
  if (!hasModulePermission(session.accountType, session.roleType, module, action)) {
    throw new ForbiddenError(`You do not have permission to ${action} in ${module}`);
  }
}
