import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import type { AppUser } from "@/types/user";

export function UserInlineLabel({ user }: { user: AppUser | null }) {
  if (!user) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <UserAvatarImage name={user.name} avatarUrl={user.avatarUrl} size={20} />
      <span className="truncate">{user.name}</span>
    </span>
  );
}
