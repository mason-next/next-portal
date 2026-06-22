import Image from "next/image";
import Link from "next/link";
import { CURRENT_USER } from "@/lib/current-user";
import { Nav } from "./Nav";
import { UserAvatar } from "./UserAvatar";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-8">
        <Link href="/projects" className="text-sm font-semibold tracking-tight">
          <Image src="/NEXT-logo.png" alt="NEXT Portal" width={4698} height={1615} className="h-6 w-auto" priority />
        </Link>
        <Nav />
      </div>
      <div className="flex items-center gap-3">
        <UserAvatar />
        <span className="text-sm font-medium">{CURRENT_USER}</span>
      </div>
    </header>
  );
}
