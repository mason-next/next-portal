"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  Clock,
  FolderOpen,
  ListChecks,
  TrendingUp,
  Users,
} from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { Skeleton } from "@/components/shared/Skeleton";
import { cn } from "@/lib/utils";

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

interface ProjectSummary {
  id: string;
  name: string;
  targetCompletionDate: string | null;
}

interface WorkloadItem {
  userId: string;
  name: string;
  taskCount: number;
}

interface DashboardData {
  isAdmin: boolean;
  // Admin fields
  totalProjects?: number;
  openTasks?: number;
  overdueTasks?: number;
  workload?: WorkloadItem[];
  // Member fields
  myProjects?: ProjectSummary[];
  myOpenTasks?: number;
  myOverdueTasks?: number;
  myMentions?: number;
  // Shared
  upcomingProjects?: ProjectSummary[];
  recentActivity?: ActivityItem[];
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  href?: string;
  tone?: "default" | "warning" | "danger";
}) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm transition-colors",
        href && "hover:bg-accent cursor-pointer",
        tone === "warning" &&
          "border-amber-200 bg-amber-50/50 dark:border-amber-800/30 dark:bg-amber-900/10",
        tone === "danger" &&
          "border-red-200 bg-red-50/50 dark:border-red-800/30 dark:bg-red-900/10"
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          tone === "warning"
            ? "bg-amber-100 dark:bg-amber-900/30"
            : tone === "danger"
            ? "bg-red-100 dark:bg-red-900/30"
            : "bg-primary/10"
        )}
      >
        <Icon
          className={cn(
            "size-5",
            tone === "warning"
              ? "text-amber-600 dark:text-amber-400"
              : tone === "danger"
              ? "text-red-600 dark:text-red-400"
              : "text-primary"
          )}
        />
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const session = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <AlertCircle className="mb-3 size-8 text-muted-foreground/40" />
        <p className="text-sm font-medium">Couldn&apos;t load dashboard</p>
        <p className="mt-1 text-xs text-muted-foreground">Refresh the page to try again.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.isAdmin
            ? "Platform overview across all projects and users."
            : `Welcome back, ${session.name}.`}
        </p>
      </div>

      {/* Stat cards */}
      {!data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : data.isAdmin ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            icon={FolderOpen}
            label="Total Projects"
            value={data.totalProjects ?? 0}
            href="/projects"
          />
          <StatCard
            icon={ListChecks}
            label="Open Tasks"
            value={data.openTasks ?? 0}
            href="/tasks"
          />
          <StatCard
            icon={AlertCircle}
            label="Overdue Tasks"
            value={data.overdueTasks ?? 0}
            href="/tasks"
            tone={(data.overdueTasks ?? 0) > 0 ? "danger" : "default"}
          />
          <StatCard
            icon={Users}
            label="Team Members"
            value={(data.workload ?? []).length}
            href="/admin"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            icon={FolderOpen}
            label="My Projects"
            value={data.myProjects?.length ?? 0}
            href="/projects"
          />
          <StatCard
            icon={ListChecks}
            label="Open Tasks"
            value={data.myOpenTasks ?? 0}
            href="/tasks"
          />
          <StatCard
            icon={AlertCircle}
            label="Overdue Tasks"
            value={data.myOverdueTasks ?? 0}
            href="/tasks"
            tone={(data.myOverdueTasks ?? 0) > 0 ? "danger" : "default"}
          />
          <StatCard
            icon={TrendingUp}
            label="Unread Mentions"
            value={data.myMentions ?? 0}
            href="/tasks"
            tone={(data.myMentions ?? 0) > 0 ? "warning" : "default"}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Workload or My Projects */}
          {!data ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : data.isAdmin ? (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="border-b px-5 py-3">
                <h2 className="text-sm font-semibold">Workload by Team Member</h2>
              </div>
              {(data.workload ?? []).length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No active task assignments.
                </p>
              ) : (
                <ul className="divide-y">
                  {(data.workload ?? []).map((w) => (
                    <li key={w.userId} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm font-medium">{w.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {w.taskCount} task{w.taskCount !== 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <h2 className="text-sm font-semibold">My Projects</h2>
                <Link href="/projects" className="text-xs text-primary hover:underline">
                  View all
                </Link>
              </div>
              {(data.myProjects ?? []).length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No projects assigned to you.
                </p>
              ) : (
                <ul className="divide-y">
                  {(data.myProjects ?? []).map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-accent"
                      >
                        <span className="truncate text-sm font-medium">{p.name}</span>
                        {p.targetCompletionDate && (
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                            {new Date(p.targetCompletionDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Upcoming Completions */}
          {data && (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="border-b px-5 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="size-4 text-muted-foreground" />
                  Upcoming Target Completions
                </h2>
              </div>
              {(data.upcomingProjects ?? []).length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No upcoming completions.
                </p>
              ) : (
                <ul className="divide-y">
                  {(data.upcomingProjects ?? []).map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-accent"
                      >
                        <span className="truncate text-sm font-medium">{p.name}</span>
                        <span className="ml-2 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {new Date(p.targetCompletionDate!).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Right column: Recent Activity */}
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="border-b px-5 py-3">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
          </div>
          {!data ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (data.recentActivity ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No recent activity.
            </p>
          ) : (
            <ul className="max-h-[500px] divide-y overflow-y-auto">
              {(data.recentActivity ?? []).map((a) => (
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
        </div>
      </div>
    </div>
  );
}
