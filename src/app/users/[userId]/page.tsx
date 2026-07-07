import { notFound } from "next/navigation";
import { Mail, Phone, Shield, User } from "lucide-react";
import { getUser } from "@/lib/data/users";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { ROLE_TYPE_LABELS, type RoleType } from "@/types/user";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  let user;
  try {
    user = await getUser(userId);
  } catch (err) {
    console.error("[/users/:id] getUser failed", { userId, err, stack: err instanceof Error ? err.stack : undefined });
    throw err;
  }
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="rounded-xl border bg-background p-8 shadow-sm">
        <div className="flex items-center gap-5">
          <UserAvatarImage name={user.name} avatarUrl={user.avatarUrl} size={72} />
          <div>
            <h1 className="text-xl font-semibold">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.title}</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Shield className="size-3" />
              {user.roleTypes.map((r) => ROLE_TYPE_LABELS[r as RoleType] ?? r).join(", ")}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t pt-6">
          <ContactRow icon={Mail} label="Email" value={user.email} href={`mailto:${user.email}`} />
          {user.phone && <ContactRow icon={Phone} label="Phone" value={user.phone} href={`tel:${user.phone}`} />}
          <ContactRow icon={User} label="Status" value={user.isActive ? "Active" : "Inactive"} />
        </div>

        <p className="mt-6 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Full user profiles, project history, and activity timeline coming in a future update.
        </p>
      </div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {href ? (
          <a href={href} className="text-sm text-primary hover:underline">
            {value}
          </a>
        ) : (
          <div className="text-sm">{value}</div>
        )}
      </div>
    </div>
  );
}
