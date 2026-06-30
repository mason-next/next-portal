"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  FileBarChart2,
  Wrench,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/PermissionsContext";
import type { PermissionFeature } from "@/lib/permissions";

const OPERATIONS_ITEMS: { href: string; label: string; feature: PermissionFeature }[] = [
  { href: "/projects", label: "Projects", feature: "projects" },
  { href: "/tasks",    label: "Tasks",    feature: "tasks" },
];

const SALES_ITEMS = [
  { href: "/sales",           label: "Overview" },
  { href: "/sales/activity",  label: "Activity Log" },
  { href: "/sales/deal-desk", label: "Deal Desk" },
  { href: "/sales/quotes",    label: "Quote Portal" },
];

const TOOLS_ITEMS = [
  { href: "/process",                   label: "Process" },
  { href: "/tools/service-calculator",  label: "Service Calculator" },
];

type MenuKey = "operations" | "sales" | "tools";

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<MenuKey | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const { hasAccess } = usePermissions();

  const opsActive   = pathname.startsWith("/projects") || pathname.startsWith("/tasks");
  const salesActive = pathname.startsWith("/sales") || pathname.startsWith("/deal-desk");
  const toolsActive = pathname.startsWith("/tools") || pathname.startsWith("/process");

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function toggle(key: MenuKey) {
    setOpen((prev) => (prev === key ? null : key));
  }

  const visibleOpsItems = OPERATIONS_ITEMS.filter(({ feature }) => hasAccess(feature));

  return (
    <nav ref={navRef} className="flex items-center gap-1">
      {/* Dashboard — direct link */}
      {hasAccess("dashboard") && (
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            pathname === "/dashboard" && "bg-accent text-foreground"
          )}
        >
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>
      )}

      {/* Operations dropdown — only show if at least one item is accessible */}
      {visibleOpsItems.length > 0 && (
        <Dropdown
          label="Operations"
          icon={<Briefcase className="size-4" />}
          isActive={opsActive}
          isOpen={open === "operations"}
          onToggle={() => toggle("operations")}
        >
          {visibleOpsItems.map(({ href, label }) => (
            <DropdownLink
              key={href}
              href={href}
              label={label}
              active={pathname.startsWith(href)}
              onClose={() => setOpen(null)}
            />
          ))}
        </Dropdown>
      )}

      {/* Sales dropdown */}
      {hasAccess("sales") && (
        <Dropdown
          label="Sales"
          icon={<TrendingUp className="size-4" />}
          isActive={salesActive}
          isOpen={open === "sales"}
          onToggle={() => toggle("sales")}
        >
          {SALES_ITEMS.map(({ href, label }) => (
            <DropdownLink
              key={href}
              href={href}
              label={label}
              active={href === "/sales" ? pathname === "/sales" : pathname.startsWith(href)}
              onClose={() => setOpen(null)}
            />
          ))}
        </Dropdown>
      )}

      {/* Reports — direct link */}
      {hasAccess("reports") && (
        <Link
          href="/reports"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            pathname.startsWith("/reports") && "bg-accent text-foreground"
          )}
        >
          <FileBarChart2 className="size-4" />
          Reports
        </Link>
      )}

      {/* Tools dropdown */}
      {hasAccess("tools") && (
        <Dropdown
          label="Tools"
          icon={<Wrench className="size-4" />}
          isActive={toolsActive}
          isOpen={open === "tools"}
          onToggle={() => toggle("tools")}
        >
          {TOOLS_ITEMS.map(({ href, label }) => (
            <DropdownLink
              key={href}
              href={href}
              label={label}
              active={pathname.startsWith(href)}
              onClose={() => setOpen(null)}
            />
          ))}
        </Dropdown>
      )}
    </nav>
  );
}

// ─── Shared dropdown primitives ───────────────────────────────────────────────

function Dropdown({
  label,
  icon,
  isActive,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
          isActive && "bg-accent text-foreground"
        )}
      >
        {icon}
        {label}
        <ChevronDown className={cn("size-3 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border bg-card shadow-md py-1">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownLink({
  href,
  label,
  active,
  onClose,
}: {
  href: string;
  label: string;
  active: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
        active && "text-foreground font-medium"
      )}
    >
      {label}
    </Link>
  );
}
