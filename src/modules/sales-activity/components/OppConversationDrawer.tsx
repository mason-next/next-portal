"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { RichCommentEditor, type RichCommentEditorHandle } from "@/components/shared/RichCommentEditor";
import { RichCommentView } from "@/components/shared/RichCommentView";
import { useSession } from "@/lib/auth/client";
import { useCurrentUserAvatar } from "@/lib/hooks/useCurrentUserAvatar";
import { cn } from "@/lib/utils";
import {
  getOppComments,
  addOppComment,
  updateOppComment,
  deleteOppComment,
} from "@/lib/data/sales-activity";
import type { JSONContent } from "@tiptap/core";
import type { SalesOppComment } from "@/types/sales";
import type { AppUser } from "@/types/user";

function dateGroupLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function groupByDate(items: SalesOppComment[]): { label: string; items: SalesOppComment[] }[] {
  const groups: { label: string; items: SalesOppComment[] }[] = [];
  for (const item of items) {
    const label = dateGroupLabel(item.createdAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

interface Props {
  opportunityId: string | null;
  opportunityName: string;
  onClose: () => void;
}

export function OppConversationDrawer({ opportunityId, opportunityName, onClose }: Props) {
  const session = useSession();
  const { users } = useUsersContext();
  const dbAvatar = users?.find((u) => u.id === session.id)?.avatarUrl ?? null;
  const currentUserAvatar = useCurrentUserAvatar(dbAvatar);
  const [comments, setComments] = useState<SalesOppComment[] | null>(null);
  const [isDraftEmpty, setIsDraftEmpty] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const editorRef = useRef<RichCommentEditorHandle>(null);

  const open = opportunityId !== null;

  const mentionableUsers: AppUser[] = users ?? [];

  async function refresh() {
    if (!opportunityId) return;
    const loaded = await getOppComments(opportunityId);
    setComments(loaded);
  }

  useEffect(() => {
    if (!opportunityId) {
      setComments(null);
      return;
    }
    setComments(null);
    getOppComments(opportunityId).then(setComments).catch(() => setComments([]));
  }, [opportunityId]);

  async function handlePost() {
    const editor = editorRef.current;
    if (!editor || editor.isEmpty() || !opportunityId) return;
    setSubmitting(true);
    setPostError(null);
    try {
      const { richContent, text } = editor.getPayload();
      await addOppComment(
        opportunityId,
        session.id ?? null,
        session.name,
        text,
        JSON.stringify(richContent),
      );
      editor.clear();
      setIsDraftEmpty(true);
      await refresh();
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Failed to post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteOppComment(id);
    await refresh();
  }

  const groups = groupByDate(comments ?? []);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-full sm:max-w-md flex-col border-l bg-card shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Opportunity conversation"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-semibold">Conversation</span>
            </div>
            {opportunityName && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{opportunityName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Composer */}
        <div className="border-b p-4">
          <div className="flex gap-2.5">
            <UserAvatarImage name={session.name} avatarUrl={currentUserAvatar} size={28} />
            <div className="min-w-0 flex-1">
              {open && (
                <>
                  <RichCommentEditor
                    key={opportunityId ?? "none"}
                    ref={editorRef}
                    placeholder="Add a note or update…"
                    users={mentionableUsers}
                    onSubmitShortcut={handlePost}
                    onEmptyChange={setIsDraftEmpty}
                  />
                  {postError && (
                    <p className="mt-1 text-xs text-destructive">{postError}</p>
                  )}
                  <div className="mt-1.5 flex justify-end">
                    <Button
                      size="xs"
                      onClick={handlePost}
                      disabled={submitting || isDraftEmpty}
                    >
                      {submitting ? "Posting…" : "Comment"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto p-4">
          {comments === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet. Start the conversation above.</p>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <div key={group.label}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </div>
                  <div className="space-y-3">
                    {group.items.map((comment) => (
                      <CommentRow
                        key={comment.id}
                        comment={comment}
                        currentUserName={session.name}
                        currentUserAvatar={currentUserAvatar}
                        mentionableUsers={mentionableUsers}
                        onDelete={handleDelete}
                        onEdited={refresh}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CommentRow({
  comment,
  currentUserName,
  currentUserAvatar,
  mentionableUsers,
  onDelete,
  onEdited,
}: {
  comment: SalesOppComment;
  currentUserName: string;
  currentUserAvatar: string | null;
  mentionableUsers: AppUser[];
  onDelete: (id: string) => void;
  onEdited: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editEmpty, setEditEmpty] = useState(false);
  const editRef = useRef<RichCommentEditorHandle>(null);

  const isOwn = comment.userName === currentUserName;
  const time = new Date(comment.createdAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  async function handleSaveEdit() {
    const editor = editRef.current;
    if (!editor || editor.isEmpty()) return;
    setSaving(true);
    try {
      const { richContent, text } = editor.getPayload();
      await updateOppComment(comment.id, text, JSON.stringify(richContent));
      setEditing(false);
      onEdited();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-2.5">
      <UserAvatarImage
        name={comment.userName}
        avatarUrl={comment.userName === currentUserName ? currentUserAvatar : null}
        size={28}
      />
      <div className="min-w-0 flex-1 rounded-lg bg-muted/50 p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="text-sm font-semibold">{comment.userName}</span>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>

        {editing ? (
          <div className="mt-1.5">
            <RichCommentEditor
              key={`edit-${comment.id}`}
              ref={editRef}
              users={mentionableUsers}
              initialContent={comment.richContent as JSONContent | undefined}
              onSubmitShortcut={handleSaveEdit}
              onEmptyChange={setEditEmpty}
              placeholder="Edit your note…"
            />
            <div className="mt-1.5 flex items-center gap-3">
              <Button size="xs" onClick={handleSaveEdit} disabled={saving || editEmpty}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="prose-comment mt-1 text-sm">
            {comment.richContent ? (
              <RichCommentView doc={comment.richContent as JSONContent} />
            ) : (
              <p className="text-sm text-foreground">{comment.message}</p>
            )}
          </div>
        )}

        {isOwn && !editing && (
          <div className="mt-1 flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
