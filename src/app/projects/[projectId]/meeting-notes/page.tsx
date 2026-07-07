"use client";

import { use, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { RichNoteEditor } from "@/components/shared/RichNoteEditor";
import { MultiUserSelect } from "@/components/shared/MultiUserSelect";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth/client";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { getEffectiveLevel, canLevelEdit } from "@/lib/module-permissions";
import { parseVtt } from "@/lib/vtt-parser";
import type { MeetingNote } from "@/types/meeting-notes";
import type { AppUser } from "@/types/user";
import type { MeetingSummary } from "@/app/api/ai/summarize-meeting/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const FIELD = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MeetingNotesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { roleTypes } = useSession();
  const { users } = useUsersContext();
  const canEdit = canLevelEdit(getEffectiveLevel(roleTypes, "projects"));

  const [notes, setNotes] = useState<MeetingNote[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editNote, setEditNote] = useState<MeetingNote | null>(null);
  const [error, setError] = useState(false);

  async function loadNotes() {
    try {
      const res = await fetch(`/api/projects/${projectId}/meeting-notes`);
      if (!res.ok) throw new Error();
      setNotes(await res.json());
    } catch {
      setError(true);
      setNotes([]);
    }
  }

  useEffect(() => { loadNotes(); }, [projectId]);

  async function handleDelete(noteId: string) {
    if (!confirm("Delete this meeting note?")) return;
    await fetch(`/api/projects/${projectId}/meeting-notes/${noteId}`, { method: "DELETE" });
    setNotes((prev) => prev?.filter((n) => n.id !== noteId) ?? null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Meeting Notes</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Store AI meeting recaps, summaries, and action items from project meetings.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="size-4 mr-1" />
            New Note
          </Button>
        )}
      </div>

      {notes === null ? (
        <div className="rounded-xl border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : error || notes.length === 0 ? (
        <div className="rounded-xl border border-dashed py-14 text-center">
          <CalendarDays className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">{error ? "Couldn't load notes" : "No meeting notes yet"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {error
              ? "Refresh to try again."
              : "Add your first note to start capturing meeting recaps and action items."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              users={users}
              canEdit={canEdit}
              onEdit={() => setEditNote(note)}
              onDelete={() => handleDelete(note.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <NoteFormModal
          projectId={projectId}
          users={users}
          onClose={() => setShowCreate(false)}
          onSaved={(note) => {
            setNotes((prev) => [note, ...(prev ?? [])]);
            setShowCreate(false);
          }}
        />
      )}

      {editNote && (
        <NoteFormModal
          key={editNote.id}
          projectId={projectId}
          users={users}
          note={editNote}
          onClose={() => setEditNote(null)}
          onSaved={(updated) => {
            setNotes((prev) => prev?.map((n) => (n.id === updated.id ? updated : n)) ?? null);
            setEditNote(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  users,
  canEdit,
  onEdit,
  onDelete,
}: {
  note: MeetingNote;
  users: AppUser[];
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = Boolean(note.body?.trim());
  const hasActionItems = Boolean(note.actionItems?.trim());

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-5 py-4 hover:bg-accent/40 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{note.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3" />
              {formatDate(note.meetingDate)}
            </span>
            {note.attendees.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                <span className="truncate max-w-[200px]">
                  {note.attendees
                    .map((id) => users.find((u) => u.id === id)?.name ?? id)
                    .join(", ")}
                </span>
              </span>
            )}
            <span className="text-muted-foreground/50">·</span>
            <span>
              {note.createdByName ? `Added by ${note.createdByName}` : "Added"} {timeAgo(note.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {canEdit && (
            <>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onEdit())}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Edit note"
              >
                <Pencil className="size-3.5" />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onDelete())}
                className="rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                title="Delete note"
              >
                <Trash2 className="size-3.5" />
              </span>
            </>
          )}
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground/50" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground/50" />
          )}
        </div>
      </button>

      {expanded && (hasBody || hasActionItems) && (
        <div className="border-t px-5 py-4 space-y-4">
          {hasBody && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Notes
              </p>
              <div
                className="prose-comment text-sm text-foreground"
                dangerouslySetInnerHTML={{ __html: note.body }}
              />
            </div>
          )}
          {hasActionItems && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Action Items
              </p>
              <div
                className="prose-comment text-sm text-foreground"
                dangerouslySetInnerHTML={{ __html: note.actionItems }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── VTT → HTML helpers ───────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function summaryToBodyHtml(s: MeetingSummary): string {
  const parts: string[] = [];
  if (s.summary) parts.push(`<p>${escHtml(s.summary)}</p>`);
  if (s.decisions.length > 0) {
    parts.push(
      `<p><strong>Key Decisions</strong></p><ul>${s.decisions.map((d) => `<li>${escHtml(d)}</li>`).join("")}</ul>`
    );
  }
  if (s.risks.length > 0) {
    parts.push(
      `<p><strong>Risks / Issues</strong></p><ul>${s.risks.map((r) => `<li>${escHtml(r)}</li>`).join("")}</ul>`
    );
  }
  if (s.followUps.length > 0) {
    parts.push(
      `<p><strong>Follow-ups</strong></p><ul>${s.followUps.map((f) => `<li>${escHtml(f)}</li>`).join("")}</ul>`
    );
  }
  return parts.join("");
}

function summaryToActionItemsHtml(s: MeetingSummary): string {
  if (s.actionItems.length === 0) return "";
  return `<ul>${s.actionItems
    .map((item) => {
      const owner = item.owner ? `<strong>${escHtml(item.owner)}:</strong> ` : "";
      const due = item.dueDate ? ` <em>— ${escHtml(item.dueDate)}</em>` : "";
      return `<li>${owner}${escHtml(item.action)}${due}</li>`;
    })
    .join("")}</ul>`;
}

// ─── Note Form Modal ──────────────────────────────────────────────────────────

function NoteFormModal({
  projectId,
  users,
  note,
  onClose,
  onSaved,
}: {
  projectId: string;
  users: AppUser[];
  note?: MeetingNote;
  onClose: () => void;
  onSaved: (note: MeetingNote) => void;
}) {
  const isEdit = Boolean(note);
  const [title, setTitle]             = useState(note?.title ?? "");
  const [meetingDate, setMeetingDate] = useState(note?.meetingDate ?? new Date().toISOString().split("T")[0]);
  const [attendees, setAttendees]     = useState<string[]>(note?.attendees ?? []);
  const [body, setBody]               = useState(note?.body ?? "");
  const [actionItems, setActionItems] = useState(note?.actionItems ?? "");
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  // VTT / AI summary state
  const [generating, setGenerating] = useState(false);
  const [genSuccess, setGenSuccess] = useState(false);
  const [genError, setGenError]     = useState<string | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleVttFile(file: File) {
    setGenerating(true);
    setGenError(null);
    setGenSuccess(false);
    try {
      const raw = await file.text();
      const { text: transcript } = parseVtt(raw);
      if (!transcript.trim()) {
        setGenError("Could not extract text from this file. Check that it is a valid .vtt transcript.");
        return;
      }
      const res = await fetch("/api/ai/summarize-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setGenError(`Summary generation failed: ${(errBody as { error?: string })?.error ?? `HTTP ${res.status}`}`);
        return;
      }
      const summary: MeetingSummary = await res.json();
      if (summary.title) setTitle(summary.title);
      setBody(summaryToBodyHtml(summary));
      setActionItems(summaryToActionItemsHtml(summary));
      setEditorRevision((n) => n + 1);
      setGenSuccess(true);
    } catch (err) {
      setGenError(`Unexpected error: ${String(err)}`);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = { title: title.trim(), meetingDate, attendees, body, actionItems };
      const url = isEdit
        ? `/api/projects/${projectId}/meeting-notes/${note!.id}`
        : `/api/projects/${projectId}/meeting-notes`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved: MeetingNote = await res.json();
        onSaved(saved);
      } else {
        let detail = `HTTP ${res.status}`;
        try {
          const errBody = await res.json();
          if (errBody?.error) detail = errBody.error;
        } catch { /* non-JSON body */ }
        console.error("[meeting-notes] save failed:", detail);
        setSaveError(`Failed to save: ${detail}`);
      }
    } catch (err) {
      console.error("[meeting-notes] save error:", err);
      setSaveError("Failed to save — network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-4 text-base font-semibold">{isEdit ? "Edit Meeting Note" : "New Meeting Note"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* VTT transcript upload → Claude summary */}
        <div className="rounded-lg border border-dashed bg-muted/30 px-3.5 py-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".vtt,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleVttFile(f);
              e.target.value = "";
            }}
          />
          {generating ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 shrink-0 animate-spin" />
              Analyzing transcript with Claude…
            </div>
          ) : genSuccess ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span className="flex-1">Summary generated — review and edit below</span>
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                Re-upload
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="size-4 shrink-0" />
              <span>Generate summary from .vtt transcript</span>
              <span className="ml-auto text-xs opacity-50">optional</span>
            </button>
          )}
          {genError && (
            <p className="mt-1.5 text-xs text-red-600">{genError}</p>
          )}
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Meeting Title *</span>
          <input
            className={cn(FIELD, "h-9")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Engineering Technical Kickoff"
            required
            autoFocus
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Meeting Date *</span>
            <input
              type="date"
              className={cn(FIELD, "h-9")}
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              required
            />
          </label>
          <div className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Attendees <span className="font-normal text-muted-foreground/60">optional</span>
            </span>
            <MultiUserSelect
              users={users}
              value={attendees}
              onChange={setAttendees}
              placeholder="Select attendees…"
            />
          </div>
        </div>

        <div className="block">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            Notes / Recap <span className="font-normal text-muted-foreground/60">paste AI recap here</span>
          </p>
          <RichNoteEditor
            key={editorRevision}
            defaultValue={body}
            onChange={setBody}
            placeholder="Paste your AI meeting summary, notes, or recap…"
            minHeight="min-h-40"
          />
        </div>

        <div className="block">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            Action Items <span className="font-normal text-muted-foreground/60">optional</span>
          </p>
          <RichNoteEditor
            key={editorRevision + 1000}
            defaultValue={actionItems}
            onChange={setActionItems}
            placeholder="• Owner: action by date"
            minHeight="min-h-24"
          />
        </div>

        {saveError && (
          <p className="text-sm text-red-600">{saveError}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving || !title.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Note"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
