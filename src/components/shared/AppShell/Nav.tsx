"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileBarChart2, FolderKanban, LayoutDashboard, ShieldCheck, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/projects",   label: "Projects",   icon: FolderKanban },
  { href: "/deal-desk",  label: "Deal Desk",  icon: TrendingUp },
  { href: "/reports",    label: "Reports",    icon: FileBarChart2 },
  { href: "/admin",      label: "Admin",      icon: ShieldCheck },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-accent text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
