"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Calendar, CheckCircle2, Clock, FolderOpen } from "lucide-react";
import { getProjects } from "@/lib/data/projects";
import { getWorkflowStepsForProjects } from "@/lib/data/workflow";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { useSession } from "@/lib/auth/client";
import {
  deriveProjectStatus,
  getProjectHealthSummary,
} from "@/modules/project-command-center/engine/workflow-engine";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";
import type { WorkflowStep } from "@/types/workflow";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  projectId: string;
  activityType: string;
  userName: string;
  message: string;
  createdAt: string;
  category: string;
  project: { name: string };
}

interface EnrichedProject extends Project {
  statusLabel: string;
  isComplete: boolean;
  health: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isThisMonth(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getUTCFullYear() === now.getFullYear() && d.getUTCMonth() === now.getMonth();
}

function isOverdue(project: EnrichedProject): boolean {
  if (!project.targetCompletionDate || project.isComplete) return false;
  return new Date(project.targetCompletionDate) < new Date();
}

function isUpcoming(project: EnrichedProject, days: number): boolean {
  if (!project.targetCompletionDate || project.isComplete) return false;
  const target = new Date(project.targetCompletionDate);
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + days);
  return target >= now && target <= cutoff;
}

const HEALTH_COLOR: Record<string, string> = {
  "Ahead":    "text-emerald-600 dark:text-emerald-400",
  "On Track": "text-blue-600 dark:text-blue-400",
  "At Risk":  "text-amber-600 dark:text-amber-400",
  "Off Track":"text-red-600 dark:text-red-400",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "warning" | "danger" | "success";
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 transition-colors",
        href && "cursor-pointer hover:bg-accent",
        tone === "warning" && "border-amber-200 bg-amber-50/50 dark:border-amber-800/30 dark:bg-amber-900/10",
        tone === "danger"  && "border-red-200 bg-red-50/50 dark:border-red-800/30 dark:bg-red-900/10",
        tone === "success" && "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-900/10",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            tone === "warning" ? "bg-amber-100 dark:bg-amber-900/30" :
            tone === "danger"  ? "bg-red-100 dark:bg-red-900/30" :
            tone === "success" ? "bg-emerald-100 dark:bg-emerald-900/30" :
            "bg-primary/10"
          )}
        >
          <Icon
            className={cn(
              "size-5",
              tone === "warning" ? "text-amber-600 dark:text-amber-400" :
              tone === "danger"  ? "text-red-600 dark:text-red-400" :
              tone === "success" ? "text-emerald-600 dark:text-emerald-400" :
              "text-primary"
            )}
          />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold tracking-tight mt-0.5">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : <>{content}</>;
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OperationsOverviewPage() {
  const session = useSession();
  const { users } = useUsersContext();
  const isAdmin = session.roleTypes.includes("Administrator");

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [stepsByProject, setStepsByProject] = useState<Record<string, WorkflowStep[]>>({});
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const loaded = await getProjects();
    setProjects(loaded);
    const byProject = await getWorkflowStepsForProjects(loaded.map((p) => p.id));
    setStepsByProject(byProject);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    fetch("/api/operations/summary")
      .then((r) => r.ok ? r.json() : { recentActivity: [] })
      .then((data: { recentActivity: ActivityItem[] }) => setActivity(data.recentActivity))
      .catch(() => {});
  }, []);

  // ─── Derived metrics ────────────────────────────────────────────────────────

  const now = useMemo(() => new Date(), []);

  const enriched = useMemo<EnrichedProject[]>(() => {
    if (!projects) return [];
    return projects.map((p) => {
      const steps = stepsByProject[p.id] ?? [];
      const { label: statusLabel, isComplete } = deriveProjectStatus(steps);
      const { health } = getProjectHealthSummary({
        steps,
        startDate: p.createdAt,
        targetCompletionDate: p.targetCompletionDate,
        now,
      });
      return { ...p, statusLabel, isComplete, health };
    });
  }, [projects, stepsByProject, now]);

  const activeProjects   = useMemo(() => enriched.filter((p) => !p.isComplete), [enriched]);
  const overdueProjects  = useMemo(() => enriched.filter(isOverdue), [enriched]);
  const dueThisMonth     = useMemo(() => enriched.filter((p) => isThisMonth(p.targetCompletionDate) && !p.isComplete), [enriched]);
  const closedThisMonth  = useMemo(() => enriched.filter((p) => p.isComplete && isThisMonth(p.updatedAt)), [enriched]);
  const upcomingProjects = useMemo(
    () => enriched.filter((p) => isUpcoming(p, 90)).sort((a, b) =>
      new Date(a.targetCompletionDate!).getTime() - new Date(b.targetCompletionDate!).getTime()
    ).slice(0, 10),
    [enriched]
  );

  // Projects by PM
  const byPM = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of enriched) {
      const pmId = p.fieldProjectManagerId ?? "__unassigned__";
      counts.set(pmId, (counts.get(pmId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([pmId, count]) => {
        const user = pmId === "__unassigned__" ? null : users.find((u) => u.id === pmId);
        return { name: user?.name ?? "Unassigned", count };
      })
      .sort((a, b) => b.count - a.count);
  }, [enriched, users]);

  const avgProjectsPerPM = useMemo(() => {
    const assigned = byPM.filter((r) => r.name !== "Unassigned");
    if (assigned.length === 0) return 0;
    return +(assigned.reduce((s, r) => s + r.count, 0) / assigned.length).toFixed(1);
  }, [byPM]);

  // Projects by customer
  const byCustomer = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of enriched) counts.set(p.customerName, (counts.get(p.customerName) ?? 0) + 1);
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [enriched]);

  // Projects by type
  const byType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of enriched) {
      for (const t of p.projectTypes.length > 0 ? p.projectTypes : ["Unspecified"]) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [enriched]);

  // Projects by health
  const byHealth = useMemo(() => {
    const counts: Record<string, number> = { "Ahead": 0, "On Track": 0, "At Risk": 0, "Off Track": 0 };
    for (const p of activeProjects) {
      if (p.health in counts) counts[p.health]++;
    }
    return Object.entries(counts).map(([health, count]) => ({ health, count }));
  }, [activeProjects]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Operations Overview</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isAdmin
            ? "Team-wide project health, workload, and upcoming activity."
            : "Your projects, health, and upcoming target dates."}
        </p>
      </div>

      {/* Module Nav Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { href: "/projects", label: "Projects", desc: "Browse and manage all active projects", icon: "📁" },
          { href: "/tasks",    label: "Tasks",     desc: "Track implementation tasks and action items", icon: "✅" },
          { href: "/reports",  label: "Reports",   desc: "Export project reports and data summaries", icon: "📊" },
        ].map(({ href, label, desc, icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border bg-card p-6 transition-all hover:border-primary hover:shadow-sm"
          >
            <div className="mb-3 text-2xl">{icon}</div>
            <div className="text-base font-semibold transition-colors group-hover:text-primary">{label}</div>
            <div className="mt-1 text-sm leading-snug text-muted-foreground">{desc}</div>
            <div className="mt-3 text-xs font-medium text-primary">Open →</div>
          </Link>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          icon={FolderOpen}
          label="Active Projects"
          value={loading ? "—" : activeProjects.length}
          sub={`${enriched.length} total`}
          href="/projects"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Overdue"
          value={loading ? "—" : overdueProjects.length}
          sub="past target date"
          tone={overdueProjects.length > 0 ? "danger" : "default"}
        />
        <KpiCard
          icon={Calendar}
          label="Due This Month"
          value={loading ? "—" : dueThisMonth.length}
          sub="target completion"
          tone={dueThisMonth.length > 0 ? "warning" : "default"}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Closed This Month"
          value={loading ? "—" : closedThisMonth.length}
          tone={closedThisMonth.length > 0 ? "success" : "default"}
        />
      </div>

      {/* Health + PM workload row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Project Health */}
        <SectionCard title="Active Projects by Health">
          {loading ? (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : activeProjects.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">No active projects.</div>
          ) : (
            <div className="grid grid-cols-2 divide-x divide-y">
              {byHealth.map(({ health, count }) => (
                <div key={health} className="p-5 text-center">
                  <div className={cn("text-xl font-bold", HEALTH_COLOR[health])}>{count}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{health}</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Projects by PM */}
        <SectionCard
          title="Projects by PM"
          action={<span className="text-xs text-muted-foreground">avg {avgProjectsPerPM}/PM</span>}
        >
          {loading ? (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : byPM.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">No PM assignments.</div>
          ) : (
            <ul className="max-h-56 divide-y overflow-y-auto">
              {byPM.map(({ name, count }) => (
                <li key={name} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-sm text-muted-foreground">
                    {count} project{count !== 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Upcoming + Activity row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming completions */}
        <div className="lg:col-span-1 space-y-3">
          <SectionCard
            title="Upcoming Target Completions"
            action={<span className="text-xs text-muted-foreground">next 90 days</span>}
          >
            {loading ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : upcomingProjects.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                No upcoming completions in the next 90 days.
              </div>
            ) : (
              <ul className="divide-y">
                {upcomingProjects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      className="flex items-center justify-between px-5 py-2.5 transition-colors hover:bg-accent"
                    >
                      <span className="truncate text-sm font-medium">{p.name}</span>
                      <span className="ml-2 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {new Date(p.targetCompletionDate!).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent Project Activity"
            action={
              <Link href="/projects" className="text-xs text-primary hover:underline">
                All projects →
              </Link>
            }
          >
            {activity.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                No recent activity.
              </div>
            ) : (
              <ul className="max-h-64 divide-y overflow-y-auto">
                {activity.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/projects/${a.projectId}`}
                      className="block px-5 py-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-muted-foreground">
                            {a.project.name}
                          </p>
                          <p className="text-sm">{a.message}</p>
                          <p className="text-xs text-muted-foreground">by {a.userName}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {timeAgo(a.createdAt)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Bottom row: Customer + Type */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Projects by Customer */}
        <SectionCard title="Projects by Customer">
          {loading ? (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : byCustomer.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">No projects.</div>
          ) : (
            <ul className="divide-y">
              {byCustomer.map(({ name, count }) => (
                <li key={name} className="flex items-center justify-between px-5 py-2.5">
                  <span className="truncate text-sm font-medium">{name}</span>
                  <span className="text-sm text-muted-foreground">
                    {count} project{count !== 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Projects by Type */}
        <SectionCard title="Projects by Type">
          {loading ? (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : byType.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">No project types set.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4">
              {byType.map(({ name, count }) => (
                <div key={name} className="rounded-lg border bg-muted/30 p-3 text-center">
                  <div className="text-lg font-bold">{count}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground leading-snug">{name}</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Overdue projects detail */}
      {overdueProjects.length > 0 && (
        <SectionCard title="Overdue Projects">
          <ul className="divide-y">
            {overdueProjects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.customerName}</p>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      {p.targetCompletionDate
                        ? new Date(p.targetCompletionDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                    <p className="text-xs text-muted-foreground">{p.statusLabel}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
