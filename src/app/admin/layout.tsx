import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/server";
import { getEffectiveLevel } from "@/lib/module-permissions";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  // Allow if Administrator, has users module access, or is a role that gets the admin cog in the header.
  const ADMIN_ROLES = ["Administrator", "Sales", "Engineering", "ProjectManagement", "Management"];
  const canAccessAdmin =
    session.roleTypes.some((r) => ADMIN_ROLES.includes(r)) ||
    getEffectiveLevel(session.roleTypes, "users") !== "none";

  if (!canAccessAdmin) redirect("/projects");
  return <>{children}</>;
}
