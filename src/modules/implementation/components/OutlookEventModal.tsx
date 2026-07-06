"use client";

import { useState } from "react";
import { Calendar, Clock, MapPin, Users, ExternalLink, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
import { updateTask } from "@/lib/data/implementation";
import type { TaskPriority } from "@/types/implementation";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OutlookTaskInfo {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string | null;
  projectName: string | null;
  calendarScheduledAt: string | null;
  calendarEventUrl: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildOutlookUrl(p: {
  subject: string;
  body: string;
  startdt: string;
  enddt: string;
  location: string;
  to: string;
}): string {
  // Outlook Web compose deep link — opens a pre-filled new event form.
  // Full Graph API integration (returning a real event ID) is pending OAuth config.
  const url = new URL("https://outlook.office.com/calendar/deeplink/compose");
  url.searchParams.set("subject", p.subject);
  url.searchParams.set("body", p.body);
  url.searchParams.set("startdt", p.startdt);
  url.searchParams.set("enddt", p.enddt);
  if (p.location) url.searchParams.set("location", p.location);
  if (p.to) url.searchParams.set("to", p.to);
  return url.toString();
}

function buildBody(task: OutlookTaskInfo): string {
  const lines: string[] = [];
  if (task.description) {
    lines.push(task.description);
    lines.push("");
  }
  if (task.projectName) lines.push(`Project: ${task.projectName}`);
  lines.push(`Priority: ${task.priority}`);
  if (typeof window !== "undefined") {
    lines.push(`\nPortal: ${window.location.origin}/tasks`);
  }
  return lines.join("\n");
}

const FIELD = "mt-1 h-9 w-full rounded-md border px-3 text-sm outline-none focus:border-primary bg-background";

// ─── Component ────────────────────────────────────────────────────────────────

export function OutlookEventModal({
  task,
  onClose,
  onScheduled,
}: {
  task: OutlookTaskInfo;
  onClose: () => void;
  onScheduled?: (taskId: string, scheduledAt: string, eventUrl: string) => void;
}) {
  const defaultDate = task.dueDate
    ? new Date(task.dueDate).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const [eventTitle, setEventTitle] = useState(task.title);
  const [date, setDate]             = useState(defaultDate);
  const [startTime, setStartTime]   = useState("09:00");
  const [endTime, setEndTime]       = useState("10:00");
  const [location, setLocation]     = useState("");
  const [attendees, setAttendees]   = useState("");
  const [opened, setOpened]         = useState(false);
  const [saving, setSaving]         = useState(false);

  const alreadyScheduled = Boolean(task.calendarScheduledAt);
  const lastDate = task.calendarScheduledAt
    ? new Date(task.calendarScheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  async function handleOpen() {
    const startISO = `${date}T${startTime}:00`;
    const endISO   = `${date}T${endTime}:00`;
    const body = buildBody(task);

    const url = buildOutlookUrl({
      subject: eventTitle,
      body,
      startdt: startISO,
      enddt: endISO,
      location,
      to: attendees,
    });

    window.open(url, "_blank", "noopener,noreferrer");

    setSaving(true);
    try {
      const scheduledAt = new Date().toISOString();
      await updateTask(task.id, { calendarScheduledAt: scheduledAt, calendarEventUrl: url });
      setOpened(true);
      onScheduled?.(task.id, scheduledAt, url);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="size-5 text-blue-500" />
        <h2 className="text-lg font-semibold">Create Outlook Event</h2>
      </div>

      {/* Already scheduled warning */}
      {alreadyScheduled && !opened && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-700/30 dark:bg-amber-950/20 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
          <strong>Already scheduled:</strong> This task was last sent to Outlook on {lastDate}.
          {task.calendarEventUrl && (
            <a
              href={task.calendarEventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1.5 underline underline-offset-2"
            >
              Re-open previous
            </a>
          )}
          <span className="block mt-0.5 text-amber-700/70 dark:text-amber-400/60">
            You can still create another event below.
          </span>
        </div>
      )}

      {/* Success state */}
      {opened ? (
        <div className="py-6 text-center space-y-2">
          <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
          <p className="font-semibold text-base">Outlook opened!</p>
          <p className="text-sm text-muted-foreground">
            A new event form was opened in Outlook Web. Save it there to complete scheduling.
          </p>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-3 py-1 text-xs text-amber-700 dark:text-amber-400">
            <span className="inline-block size-1.5 rounded-full bg-amber-400" />
            Microsoft Graph direct integration pending — configure OAuth to enable automatic event creation
          </div>
          <div className="mt-5">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Task context */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <p className="text-sm font-medium truncate">{task.title}</p>
            {task.projectName && (
              <p className="text-xs text-muted-foreground mt-0.5">{task.projectName} · {task.priority}</p>
            )}
          </div>

          {/* Event title */}
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Event Title</span>
            <input
              className={FIELD}
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
            />
          </label>

          {/* Date + Times */}
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3" /> Date
              </span>
              <input
                type="date"
                className={FIELD}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" /> Start
              </span>
              <input
                type="time"
                className={FIELD}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" /> End
              </span>
              <input
                type="time"
                className={FIELD}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
          </div>

          {/* Location */}
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3" /> Location
              <span className="font-normal text-muted-foreground/60 ml-0.5">optional</span>
            </span>
            <input
              className={FIELD}
              placeholder="Conference room, Teams link, etc."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>

          {/* Attendees */}
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Users className="size-3" /> Attendees
              <span className="font-normal text-muted-foreground/60 ml-0.5">optional, comma-separated emails</span>
            </span>
            <input
              className={FIELD}
              placeholder="john@example.com, jane@example.com"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
            />
          </label>

          {/* Graph integration notice */}
          <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-amber-400 shrink-0" />
            Microsoft Graph integration not yet configured — events open in Outlook Web for manual save.
            Scheduling history will still be recorded here.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleOpen}
              disabled={saving || !date || !eventTitle.trim()}
            >
              <ExternalLink className="size-4 mr-1.5" />
              {saving ? "Opening…" : "Open in Outlook"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
