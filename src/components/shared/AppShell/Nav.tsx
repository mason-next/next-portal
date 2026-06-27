"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { FileBarChart2, FolderKanban, LayoutDashboard, ShieldCheck, TrendingUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects",  label: "Projects",  icon: FolderKanban },
  { href: "/reports",   label: "Reports",   icon: FileBarChart2 },
  { href: "/admin",     label: "Admin",     icon: ShieldCheck },
];

const SALES_ITEMS = [
  { href: "/sales",            label: "Dashboard" },
  { href: "/sales/activity",   label: "Activity" },
  { href: "/sales/deal-desk",  label: "Deal Desk" },
  { href: "/sales/quotes",     label: "Interactive Quotes" },
];

export function Nav() {
  const pathname = usePathname();
  const [salesOpen, setSalesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const salesActive = pathname.startsWith("/sales") || pathname.startsWith("/deal-desk");

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSalesOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

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

      {/* Sales dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setSalesOpen((o) => !o)}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            salesActive && "bg-accent text-foreground"
          )}
        >
          <TrendingUp className="size-4" />
          Sales
          <ChevronDown className={cn("size-3 transition-transform", salesOpen && "rotate-180")} />
        </button>
        {salesOpen && (
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border bg-card shadow-md py-1">
            {SALES_ITEMS.map(({ href, label }) => {
              const active = href === "/sales" ? pathname === "/sales" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSalesOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
                    active && "text-foreground font-medium"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
