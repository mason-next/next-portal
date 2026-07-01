"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { NotificationBell } from "@/modules/notifications/components/NotificationBell";
import { Nav } from "./Nav";
import { UserAvatar } from "./UserAvatar";

export function Header() {
  const session = useSession();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-8">
        <Link href="/projects" className="text-sm font-semibold tracking-tight">
          <Image src="/NEXT-logo.png" alt="NEXT Portal" width={2910} height={386} className="h-8 w-auto" priority />
        </Link>
        <Nav />
      </div>
      <div className="flex items-center gap-3">
        {session.accountType !== "Viewer" ? (
          <Link
            href="/admin"
            title="Admin Settings"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings className="size-4" />
          </Link>
        ) : null}
        <NotificationBell />
        <UserAvatar />
        <span className="text-sm font-medium">{session.name}</span>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  );
}
