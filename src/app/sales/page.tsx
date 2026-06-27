import Link from "next/link";
import { getDealDeskQuotes } from "@/lib/data/deal-desk";
import { getSalesLogos, getSalesActivities } from "@/lib/data/sales-activity";
import { calcFinancials } from "@/modules/deal-desk/lib/financial-calc";
import { getWeekStart } from "@/types/sales";

async function getTechNews() {
  try {
    const res = await fetch(
      "https://feeds.feedburner.com/TechCrunch",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const items: { title: string; link: string; pub: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const inner = match[1];
      const title = inner.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
                    inner.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
      const link = inner.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
      const pub = inner.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
      if (title && link) items.push({ title, link, pub });
    }
    return items;
  } catch {
    return [];
  }
}

export default async function SalesDashboardPage() {
  const [quotes, logos, activities, news] = await Promise.all([
    getDealDeskQuotes(),
    getSalesLogos(),
    getSalesActivities({ weekStart: getWeekStart() }),
    getTechNews(),
  ]);

  const totalRevenue = quotes.reduce((s, q) => s + calcFinancials(q.categories).revenueCents, 0);
  const pipelineCount = logos.filter((l) => !["Closed Won", "Closed Lost"].includes(l.stage)).length;
  const closedWon = logos.filter((l) => l.stage === "Closed Won").length;
  const weekActivities = activities.length;

  const recentQuotes = quotes
    .slice()
    .sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sales Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of pipeline, activity, and recent deals</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Quote Revenue", value: `$${(totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, sub: `${quotes.length} quotes` },
          { label: "Active Pipeline", value: pipelineCount.toString(), sub: `${logos.length} total companies` },
          { label: "Closed Won", value: closedWon.toString(), sub: "of tracked companies" },
          { label: "Activities This Week", value: weekActivities.toString(), sub: "logged this week" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-xl border bg-card p-5">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Quotes */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent Quotes</h2>
            <Link href="/sales/deal-desk" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground">Project</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 text-right text-xs text-muted-foreground">Revenue</th>
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentQuotes.map((q) => {
                  const f = calcFinancials(q.categories);
                  return (
                    <tr key={q.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/sales/deal-desk/${q.id}`} className="hover:underline text-primary">{q.projectName}</Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{q.customer}</td>
                      <td className="px-4 py-3 text-right tabular-nums">${(f.revenueCents / 100).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{q.status}</span>
                      </td>
                    </tr>
                  );
                })}
                {recentQuotes.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No quotes yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tech News Feed */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Tech News</h2>
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            {news.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">News feed unavailable.</div>
            ) : news.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 hover:bg-muted/20 transition-colors"
              >
                <p className="text-sm font-medium line-clamp-2 leading-snug">{item.title}</p>
                {item.pub && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(item.pub).toLocaleDateString()}
                  </p>
                )}
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Updated hourly · TechCrunch</p>
        </div>
      </div>

      {/* Pipeline Stage Summary */}
      {logos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pipeline by Stage</h2>
            <Link href="/sales/activity" className="text-xs text-primary hover:underline">Manage →</Link>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {["Prospecting","Qualifying","Proposal","Negotiation","Closed Won","Closed Lost"].map((stage) => {
              const count = logos.filter((l) => l.stage === stage).length;
              return (
                <div key={stage} className="rounded-lg border bg-card p-3 text-center">
                  <div className="text-xs text-muted-foreground">{stage}</div>
                  <div className="text-xl font-bold mt-1">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
