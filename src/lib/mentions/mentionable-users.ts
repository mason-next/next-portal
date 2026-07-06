import { ROLE_NOT_NEEDED } from "@/lib/role-assignment";
import type { Project } from "@/types/project";
import type { AppUser } from "@/types/user";

// Users with Administrator account type are mentionable on every project regardless of
// direct assignment — they have global visibility by virtue of their access level.
function isGloballyMentionable(user: AppUser): boolean {
  return user.roleTypes.includes("Administrator");
}

// The roster the @-mention dropdown shows, and the authoritative filter `addProjectComment`
// re-checks at submit time: the project's currently-assigned team, plus every admin,
// minus anyone inactive. The dropdown is just UX convenience — enforcement happens again
// when the comment is actually posted, since eligibility can change between typing and posting.
export function getMentionableUsers(project: Project, allUsers: AppUser[]): AppUser[] {
  const assignedIds = new Set(
    [
      project.solutionsExecutiveId,
      project.solutionsEngineerId,
      project.fieldProjectManagerId,
      project.seniorInsideId,
      project.insidePMId,
      ...project.technicians.map((t) => t.userId).filter(Boolean),
    ].filter((id): id is string => Boolean(id) && id !== ROLE_NOT_NEEDED)
  );

  const byId = new Map<string, AppUser>();
  for (const user of allUsers) {
    if (user.isActive === false) continue;
    if (assignedIds.has(user.id) || isGloballyMentionable(user)) {
      byId.set(user.id, user);
    }
  }
  return [...byId.values()];
}
