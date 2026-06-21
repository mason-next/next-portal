import Link from "next/link";
import { CURRENT_USER } from "@/lib/current-user";
import { Nav } from "./Nav";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-8">
        <Link href="/projects" className="text-sm font-semibold tracking-tight">
          NEXT Portal
        </Link>
        <Nav />
      </div>
      <div className="flex items-center gap-3">
        <span className="size-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-700" />
        <span className="text-sm font-medium">{CURRENT_USER}</span>
      </div>
    </header>
  );
}
