"use client";

import { useMemo, useState } from "react";
import type { SalesActivity } from "@/types/sales";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  Call:     "bg-blue-400",
  Email:    "bg-indigo-400",
  Meeting:  "bg-violet-400",
  Research: "bg-amber-400",
  Demo:     "bg-cyan-500",
  Proposal: "bg-emerald-500",
  Other:    "bg-slate-400",
};

const TYPE_BG: Record<string, string> = {
  Call:     "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Email:    "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  Meeting:  "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  Research: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Demo:     "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  Proposal: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Other:    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const TYPE_ICONS: Record<string, string> = {
  Call: "📞", Email: "✉️", Meeting: "🗓", Research: "🔍", Demo: "💻", Proposal: "📄", Other: "📝",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getMonthGrid(year: number, month: number): Date[] {
  // Grid starts on Monday — find the Monday on or before the 1st of the month
  const first = new Date(Date.UTC(year, month, 1));
  const dow = first.getUTCDay(); // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow;
  const gridStart = new Date(first);
  gridStart.setUTCDate(1 + offset);

  // 6 rows × 7 days
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setUTCDate(gridStart.getUTCDate() + i);
    days.push(d);
  }
  return days;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActivityPill({ activity }: { activity: SalesActivity }) {
  const co = activity.company ?? activity.opportunity?.company ?? null;
  return (
    <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium truncate ${TYPE_BG[activity.type] ?? TYPE_BG.Other}`}>
      <span>{TYPE_ICONS[activity.type] ?? "📝"}</span>
      <span className="truncate">{co?.name ?? activity.type}</span>
    </div>
  );
}

function DayCell({
  date, isCurrentMonth, isToday, activities, isSelected, onClick,
}: {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  activities: SalesActivity[];
  isSelected: boolean;
  onClick: () => void;
}) {
  const MAX_PILLS = 3;
  const shown = activities.slice(0, MAX_PILLS);
  const overflow = activities.length - MAX_PILLS;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-h-[80px] p-1.5 text-left border rounded-lg transition-colors w-full
        ${isCurrentMonth ? "bg-card" : "bg-muted/20"}
        ${isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground/30"}
        ${isToday ? "ring-2 ring-primary/30" : ""}`}
    >
      {/* Day number */}
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs mb-1
        ${isToday
          ? "bg-primary text-primary-foreground font-bold"
          : isCurrentMonth ? "font-medium text-foreground" : "text-muted-foreground/40"}`}>
        {date.getUTCDate()}
      </span>

      {/* Activity pills */}
      <div className="space-y-0.5">
        {shown.map((a) => (
          <ActivityPill key={a.id} activity={a} />
        ))}
        {overflow > 0 && (
          <div className="text-[9px] font-medium text-muted-foreground pl-1">+{overflow} more</div>
        )}
      </div>

      {/* Dot indicators when pills are hidden (month with many activities) */}
      {activities.length > 0 && shown.length === 0 && (
        <div className="flex gap-0.5 flex-wrap mt-1">
          {activities.slice(0, 6).map((a, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[a.type] ?? "bg-slate-400"}`} />
          ))}
        </div>
      )}
    </button>
  );
}

function DayPanel({
  date, activities, isManagement, onEdit, onDelete, onClose,
}: {
  date: Date | null;
  activities: SalesActivity[];
  isManagement?: boolean;
  onEdit?: (a: SalesActivity) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  if (!date) return null;
  const label = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

  return (
    <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <div>
          <h3 className="text-sm font-semibold">{label}</h3>
          <p className="text-xs text-muted-foreground">{activities.length} activit{activities.length !== 1 ? "ies" : "y"}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Activity list */}
      {activities.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">No activities this day.</div>
      ) : (
        <ul className="divide-y">
          {activities.map((a) => {
            const co = a.company ?? a.opportunity?.company ?? null;
            return (
              <li key={a.id} className="group flex items-start gap-3 px-4 py-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm ${TYPE_BG[a.type] ?? TYPE_BG.Other}`}>
                  {TYPE_ICONS[a.type] ?? "📝"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{a.type}</span>
                    {co && <span className="text-sm text-muted-foreground truncate">· {co.name}</span>}
                    {a.aiGenerated && (
                      <span className="rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-1.5 py-px text-[10px] font-semibold shrink-0">AI</span>
                    )}
                    {isManagement && a.userName && (
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">{a.userName}</span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description.split("\n\n")[0]}</p>
                  )}
                  {a.contacts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {a.contacts.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">
                          <span className="font-medium">{c.name}</span>
                          {c.title && <span className="text-muted-foreground">· {c.title}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {onEdit && (
                    <button type="button" onClick={() => onEdit(a)}
                      className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button type="button"
                      onClick={() => confirm("Delete this activity?") && onDelete(a.id)}
                      className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      ✕
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface ActivityCalendarProps {
  activities: SalesActivity[];
  isManagement?: boolean;
  onEdit?: (activity: SalesActivity) => void;
  onDelete?: (id: string) => void;
  onDayClick?: (date: Date) => void; // to open log form pre-filled
}

export function ActivityCalendar({
  activities, isManagement, onEdit, onDelete, onDayClick,
}: ActivityCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDate(null);
  }
  function goToday() {
    setYear(today.getUTCFullYear());
    setMonth(today.getUTCMonth());
    setSelectedDate(null);
  }

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  // Map ISO date → activities for that week (weekStart = Monday)
  const byWeekStart = useMemo(() => {
    const map = new Map<string, SalesActivity[]>();
    for (const a of activities) {
      const key = a.weekStart.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [activities]);

  // For a given date cell, find activities: on their exact weekStart Monday
  // or distribute across the week if they fall within Mon-Sun of that week
  function getActivitiesForDay(date: Date): SalesActivity[] {
    const iso = isoDate(date);
    // Show activities on the Monday of their week
    return byWeekStart.get(iso) ?? [];
  }

  const todayIso = isoDate(today);
  const selectedIso = selectedDate ? isoDate(selectedDate) : null;
  const selectedActivities = selectedDate ? getActivitiesForDay(selectedDate) : [];

  return (
    <div className="space-y-4">
      {/* Nav bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2 className="text-sm font-semibold w-36 text-center">{MONTHS[month]} {year}</h2>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={goToday}
            className="ml-1 rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
          >
            Today
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-xs text-muted-foreground">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Day cells — 6 rows */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((date) => {
            const iso = isoDate(date);
            const dayActivities = getActivitiesForDay(date);
            const isCurrentMonth = date.getUTCMonth() === month;
            const isToday = iso === todayIso;
            const isSelected = iso === selectedIso;

            return (
              <DayCell
                key={iso}
                date={date}
                isCurrentMonth={isCurrentMonth}
                isToday={isToday}
                activities={dayActivities}
                isSelected={isSelected}
                onClick={() => {
                  if (isSelected) { setSelectedDate(null); return; }
                  setSelectedDate(date);
                  if (dayActivities.length === 0 && onDayClick) onDayClick(date);
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDate && (
        <DayPanel
          date={selectedDate}
          activities={selectedActivities}
          isManagement={isManagement}
          onEdit={onEdit}
          onDelete={onDelete}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
