"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@/lib/PermissionsContext";
import { getSalesActivities } from "@/lib/data/sales-activity";
import type { SalesActivity } from "@/types/sales";
import { useCrmAccess } from "@/modules/crm/hooks/useCrmAccess";
import { CrmDashboard } from "@/modules/crm/components/CrmDashboard";
import { Panel, Empty } from "@/modules/crm/components/ui";

interface NewsItem { title: string; link: string; pub: string }

const TYPE_ICONS: Record<string, string> = {
  Call: "📞", Email: "✉️", Meeting: "🗓", Research: "🔍",
  Demo: "💻", Proposal: "📄", Other: "📝",
};

// Sales dashboard: the CRM dashboard plus what the old Sales Overview had that the CRM
// doesn't — links to the other sales tools, the weekly activity feed and tech news.
export default function SalesDashboardPage() {
  const access = useCrmAccess();
  const { getLevel } = usePermissions();
  const [recent, setRecent] = useState<SalesActivity[] | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);

  // Admins see everyone's activity unless View As is active; others only their own
  // (the server enforces this either way).
  const scopeToUser = useMemo(() => (access.isManager ? undefined : access.userName), [access.isManager, access.userName]);

  useEffect(() => {
    getSalesActivities({ userName: scopeToUser })
      .then((all) => setRecent([...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8)))
      .catch(() => setRecent([]));
    fetch("/api/sales/news").then((r) => r.json()).then(setNews).catch(() => {});
  }, [scopeToUser]);

  const tools = [
    { href: "/sales/activity", label: "Activity Log", desc: "Weekly calls, emails, meetings and the pipeline board", module: "salesActivity" as const },
    { href: "/sales/deal-desk", label: "Deal Desk", desc: "Quotes, commissions and payout milestones", module: "salesDealDesk" as const },
    { href: "/sales/quotes", label: "Quote Portal", desc: "Customer-facing quote presentations", module: "salesQuotes" as const },
  ].filter((t) => getLevel(t.module) !== "none");

  return (
    <CrmDashboard>
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Recent activity log"
          actions={<Link href="/sales/activity" className="text-xs text-primary hover:underline">View all →</Link>}
        >
          {recent === null ? <Empty>Loading…</Empty> : recent.length === 0 ? <Empty>No activities logged yet.</Empty> : (
            <ul className="divide-y">
              {recent.map((a) => {
                const co = a.company ?? a.opportunity?.company ?? null;
                return (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="mt-0.5 shrink-0 text-sm">{TYPE_ICONS[a.type] ?? "📝"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-medium">{a.type}</span>
                        {co && <Link href={`/sales/accounts/${co.id}`} className="text-muted-foreground hover:text-foreground hover:underline">· {co.name}</Link>}
                        {a.userName && <span className="text-muted-foreground">· {a.userName}</span>}
                        <span className="ml-auto text-muted-foreground/60">
                          {new Date(a.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                        </span>
                      </div>
                      {a.description && <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{a.description.split("\n\n")[0]}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          {tools.length > 0 && (
            <Panel title="More sales tools">
              <ul className="divide-y">
                {tools.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href} className="block px-4 py-2.5 hover:bg-muted/30">
                      <div className="text-sm font-medium">{t.label} <span className="text-primary">→</span></div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Tech news">
            {news.length === 0 ? <Empty>Loading news…</Empty> : (
              <ul className="divide-y">
                {news.slice(0, 5).map((item, i) => (
                  <li key={i}>
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="block px-4 py-2.5 hover:bg-muted/30">
                      <p className="line-clamp-2 text-sm font-medium leading-snug">{item.title}</p>
                      {item.pub && <p className="mt-0.5 text-xs text-muted-foreground">{new Date(item.pub).toLocaleDateString()}</p>}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </CrmDashboard>
  );
}
