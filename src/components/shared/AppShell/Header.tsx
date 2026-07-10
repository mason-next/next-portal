"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Eye,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Settings,
  TrendingUp,
  Wrench,
  X,
} from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { usePermissions } from "@/lib/PermissionsContext";
import { useViewAs } from "@/lib/view-as/ViewAsContext";
import type { PermissionFeature } from "@/lib/permissions";
import { NotificationBell } from "@/modules/notifications/components/NotificationBell";
import { ORG_CHART_ENABLED } from "@/lib/feature-flags";
import { Nav } from "./Nav";
import { UserAvatar } from "./UserAvatar";
import { ViewAsSelector } from "./ViewAsSelector";
import { cn } from "@/lib/utils";

// feature: null means visibility is gated at the item level (show section if any item is accessible)
type MobileNavSection = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  feature: PermissionFeature | null;
  items: { href: string; label: string; feature?: PermissionFeature }[];
};

const MOBILE_NAV_SECTIONS: MobileNavSection[] = [
  {
    key: "operations",
    label: "Operations",
    icon: Briefcase,
    feature: null, // gate at item level — matches Nav.tsx behaviour
    items: [
      { href: "/projects", label: "Projects", feature: "projects" },
      { href: "/tasks",    label: "Tasks",    feature: "tasks" },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    icon: TrendingUp,
    feature: "sales",
    items: [
      { href: "/sales",           label: "Overview" },
      { href: "/sales/activity",  label: "Activity Log" },
      { href: "/sales/deal-desk", label: "Deal Desk" },
      { href: "/sales/quotes",    label: "Quote Portal" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: FileBarChart2,
    feature: "reports",
    items: [{ href: "/reports", label: "Reports" }],
  },
  {
    key: "tools",
    label: "Tools",
    icon: Wrench,
    feature: "tools",
    items: [
      { href: "/process",                  label: "Process" },
      { href: "/tools/service-calculator", label: "Service Calculator" },
    ],
  },
];

export function Header() {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { hasAccess } = usePermissions();
  const { isViewAsMode } = useViewAs();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showViewAsSelector, setShowViewAsSelector] = useState(false);
  const isAdmin = session.roleTypes.includes("Administrator");

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        {/* Left: logo */}
        <div className="flex items-center gap-8">
          <Link href="/projects" className="text-sm font-semibold tracking-tight">
            <Image src="/mason-logo.png" alt="NEXT Portal" width={2910} height={386} className="h-4 w-auto" priority />
          </Link>
          {/* Desktop nav — hidden on mobile */}
          <div className="hidden md:block">
            <Nav />
          </div>
        </div>

        {/* Right: desktop controls + hamburger */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Desktop-only controls */}
          {ORG_CHART_ENABLED && (
            <Link
              href="/org-chart"
              title="Org Chart"
              className={cn(
                "hidden md:flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                pathname.startsWith("/org-chart") && "bg-accent text-foreground",
              )}
            >
              <Network className="size-4" />
            </Link>
          )}
          {session.roleTypes.includes("Administrator") ||
           session.roleTypes.some((r) => ["Sales", "Engineering", "ProjectManagement", "Management"].includes(r)) ? (
            <Link
              href="/admin"
              title="Admin Settings"
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings className="size-4" />
            </Link>
          ) : null}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowViewAsSelector(true)}
              title={isViewAsMode ? "Change viewed user" : "View As another user"}
              className={cn(
                "hidden md:flex h-8 items-center gap-1.5 rounded-md px-2 text-sm transition-colors",
                isViewAsMode
                  ? "bg-amber-400/20 text-amber-700 hover:bg-amber-400/30 dark:text-amber-400"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Eye className="size-4" />
              <span className="hidden lg:inline">View As</span>
            </button>
          )}
          <NotificationBell />
          <div className="hidden md:block"><UserAvatar /></div>
          <span className="hidden md:block text-sm font-medium">{session.name}</span>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="hidden md:flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
          </button>

          {/* Mobile hamburger — shown only on small screens */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile nav drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex-col bg-card border-r shadow-xl transition-transform duration-200 ease-out md:hidden",
          menuOpen ? "flex translate-x-0" : "flex -translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/projects" onClick={() => setMenuOpen(false)}>
            <Image src="/mason-logo.png" alt="NEXT Portal" width={2910} height={386} className="h-4 w-auto" priority />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4">
          {hasAccess("dashboard") && (
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                pathname === "/dashboard" && "text-foreground bg-muted"
              )}
            >
              <LayoutDashboard className="size-4 shrink-0" />
              Dashboard
            </Link>
          )}
          {ORG_CHART_ENABLED && (
            <Link
              href="/org-chart"
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                pathname.startsWith("/org-chart") && "text-foreground bg-muted",
              )}
            >
              <Network className="size-4 shrink-0" />
              Org Chart
            </Link>
          )}
          {MOBILE_NAV_SECTIONS.map((section) => {
            // For sections with a null feature, show if any item is accessible
            const sectionVisible = section.feature
              ? hasAccess(section.feature)
              : section.items.some((item) => !item.feature || hasAccess(item.feature));
            if (!sectionVisible) return null;
            const Icon = section.icon;
            return (
              <div key={section.key}>
                <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mt-2">
                  <Icon className="size-3.5" />
                  {section.label}
                </div>
                {section.items.map((item) => {
                  if (item.feature && !hasAccess(item.feature)) return null;
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center px-8 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                        active && "text-foreground font-medium bg-accent"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Drawer footer: user info + admin + logout */}
        <div className="border-t p-4 space-y-1">
          <div className="flex items-center gap-3 py-2">
            <UserAvatar />
            <div>
              <div className="text-sm font-medium">{session.name}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {session.roleTypes.join(", ")}
              </div>
            </div>
          </div>
          {(session.roleTypes.includes("Administrator") ||
            session.roleTypes.some((r) => ["Sales", "Engineering", "ProjectManagement", "Management"].includes(r))) && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Settings className="size-4" />
              Admin Settings
            </Link>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => { setMenuOpen(false); setShowViewAsSelector(true); }}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted",
                isViewAsMode ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="size-4" />
              {isViewAsMode ? "Change Viewed User" : "View As"}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </div>

      {showViewAsSelector && <ViewAsSelector onClose={() => setShowViewAsSelector(false)} />}
    </>
  );
}
