import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/server";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session || session.accountType === "Viewer") {
    redirect("/projects");
  }
  return <>{children}</>;
}
