"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSalesCompanies, getSalesActivities } from "@/lib/data/sales-activity";
import { getWeekStart } from "@/types/sales";
import type { SalesActivity, SalesCompany } from "@/types/sales";

interface NewsItem { title: string; link: string; pub: string }

const TYPE_ICONS: Record<string, string> = {
  Call: "📞", Email: "✉️", Meeting: "🗓", Research: "🔍",
  Demo: "💻", Proposal: "📄", Other: "📝",
};

export default function SalesDashboardPage() {
  const [companies, setCompanies] = useState<SalesCompany[]>([]);
  const [weekActivities, setWeekActivities] = useState<SalesActivity[]>([]);
  const [recentActivities, setRecentActivities] = useState<SalesActivity[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSalesCompanies(),
      getSalesActivities({ weekStart: getWeekStart() }),
      getSalesActivities({}),
    ]).then(([cos, week, all]) => {
      setCompanies(cos);
      setWeekActivities(week);
      setRecentActivities(
        [...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8)
      );
      setLoading(false);
    });

    fetch("/api/sales/news")
      .then((r) => r.json())
      .then((data) => setNews(data))
      .catch(() => {});
  }, []);

  const allOpps = companies.flatMap((c) => c.opportunities ?? []);
  const activeOpps = allOpps.filter((o) => !["Closed Won", "Closed Lost"].includes(o.stage));
  const wonOpps = allOpps.filter((o) => o.stage === "Closed Won");
  const pipelineValue = activeOpps.reduce((s, o) => s + (o.value ?? 0), 0);
  const wonValue = wonOpps.reduce((s, o) => s + (o.value ?? 0), 0);

  function fmtDollars(cents: number) {
    const v = cents / 100;
    if (v >= 1_000_000) return "$" + (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (v >= 1_000) return "$" + Math.round(v / 1_000) + "K";
    return "$" + Math.round(v).toLocaleString();
  }

  return (
    <div className="mx-auto max-w-7xl p-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sales Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of pipeline, activity, and recent deals</p>
      </div>

      {/* Module Nav Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { href: "/sales/activity", label: "Sales Activity", desc: "Track prospects and log weekly calls, emails, meetings, and demos", icon: "📊" },
          { href: "/sales/deal-desk", label: "Deal Desk", desc: "Import quotes, review commissions, and manage payout milestones", icon: "💼" },
          { href: "/sales/quotes", label: "Interactive Quote Portal", desc: "Share customer-facing HTML presentations with email-gated access", icon: "🔗" },
        ].map(({ href, label, desc, icon }) => (
          <Link key={href} href={href} className="group rounded-xl border bg-card p-6 hover:border-primary hover:shadow-sm transition-all">
            <div className="text-2xl mb-3">{icon}</div>
            <div className="font-semibold text-base group-hover:text-primary transition-colors">{label}</div>
            <div className="text-sm text-muted-foreground mt-1 leading-snug">{desc}</div>
            <div className="text-xs text-primary mt-3 font-medium">Open →</div>
          </Link>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Active Pipeline",   value: loading ? "—" : fmtDollars(pipelineValue), sub: `${activeOpps.length} opp${activeOpps.length !== 1 ? "s" : ""} · ${companies.length} companies` },
          { label: "Closed Won",        value: loading ? "—" : fmtDollars(wonValue),       sub: `${wonOpps.length} deal${wonOpps.length !== 1 ? "s" : ""} won` },
          { label: "Activities Logged", value: loading ? "—" : weekActivities.length.toString(), sub: "this week" },
          { label: "Companies Tracked", value: loading ? "—" : companies.length.toString(), sub: "in pipeline" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-xl border bg-card p-5">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <Link href="/sales/activity" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : recentActivities.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No activities logged yet.</div>
            ) : (
              <ul className="divide-y">
                {recentActivities.map((a) => {
                  const co = a.company ?? a.opportunity?.company ?? null;
                  return (
                    <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                      <span className="text-sm shrink-0 mt-0.5">{TYPE_ICONS[a.type] ?? "📝"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          <span className="font-medium">{a.type}</span>
                          {co && <span className="text-muted-foreground">· {co.name}</span>}
                          {a.userName && <span className="text-muted-foreground">· {a.userName}</span>}
                          <span className="text-muted-foreground/50 ml-auto">
                            {new Date(a.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                          </span>
                        </div>
                        {a.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{a.description.split("\n\n")[0]}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Tech News Feed */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Tech News</h2>
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            {news.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">Loading news…</div>
            ) : news.map((item, i) => (
              <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="block p-4 hover:bg-muted/20 transition-colors">
                <p className="text-sm font-medium line-clamp-2 leading-snug">{item.title}</p>
                {item.pub && <p className="text-xs text-muted-foreground mt-1">{new Date(item.pub).toLocaleDateString()}</p>}
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Updated hourly · TechCrunch</p>
        </div>
      </div>

      {/* Pipeline Stage Summary */}
      {allOpps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pipeline by Stage</h2>
            <Link href="/sales/activity" className="text-xs text-primary hover:underline">Manage →</Link>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {["Prospecting","Qualifying","Proposal","Negotiation","Closed Won","Closed Lost"].map((stage) => {
              const stageOpps = allOpps.filter((o) => o.stage === stage);
              const stageValue = stageOpps.reduce((s, o) => s + (o.value ?? 0), 0);
              return (
                <div key={stage} className="rounded-lg border bg-card p-3 text-center">
                  <div className="text-xs text-muted-foreground">{stage}</div>
                  <div className="text-xl font-bold mt-1">{stageOpps.length}</div>
                  {stageValue > 0 && <div className="text-xs text-muted-foreground mt-0.5">{fmtDollars(stageValue)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
