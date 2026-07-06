import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/server";
import { getEffectiveLevel } from "@/lib/module-permissions";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  // Allow if Administrator role type OR at least viewer access to the users module.
  const canAccessAdmin =
    session.roleTypes.includes("Administrator") ||
    getEffectiveLevel(session.roleTypes, "users") !== "none";

  if (!canAccessAdmin) redirect("/projects");
  return <>{children}</>;
}
