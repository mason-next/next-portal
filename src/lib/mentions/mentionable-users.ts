import { ROLE_NOT_NEEDED } from "@/lib/role-assignment";
import type { Project } from "@/types/project";
import type { AppUser, UserRole } from "@/types/user";

// Global roles that make a user mentionable on every project, regardless of whether they're
// directly assigned to it — distinct from the project's own 4 per-project assignment fields.
export const GLOBAL_MENTION_ROLES: ReadonlySet<UserRole> = new Set([
  "Administrator",
  "Project Manager",
  "Engineering Manager",
  "Procurement Manager",
]);

// The roster the @-mention dropdown shows, and the authoritative filter `addProjectComment`
// re-checks at submit time: the project's currently-assigned team, plus every globally-roled
// user, minus anyone inactive. The dropdown is just UX convenience — enforcement happens again
// when the comment is actually posted, since eligibility can change between typing and posting.
export function getMentionableUsers(project: Project, allUsers: AppUser[]): AppUser[] {
  const assignedIds = new Set(
    [
      project.solutionsExecutiveId,
      project.solutionsEngineerId,
      project.leadTechnicianId,
      project.fieldProjectManagerId,
      project.seniorInsideId,
      project.projectManagerId,
      project.insidePMId,
    ].filter((id): id is string => Boolean(id) && id !== ROLE_NOT_NEEDED)
  );

  const byId = new Map<string, AppUser>();
  for (const user of allUsers) {
    if (user.isActive === false) continue;
    if (assignedIds.has(user.id) || GLOBAL_MENTION_ROLES.has(user.role)) {
      byId.set(user.id, user);
    }
  }
  return [...byId.values()];
}
