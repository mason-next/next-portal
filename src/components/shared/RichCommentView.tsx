"use client";

import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { FileText } from "lucide-react";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { isSafeLinkHref } from "@/lib/richtext/markdown";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";
import type { CommentAttachment } from "@/types/attachments";

// Renders a comment's richContent (Tiptap's JSON document format) for display. Deliberately a
// pure JSON → React tree-walk, not a second (read-only) Tiptap Editor instance — mounting a
// full ProseMirror editor per activity row would be needless overhead for a feed that can have
// many rows, and a tree-walk can never execute injected markup since it only ever produces
// React elements/text, never raw HTML (no dangerouslySetInnerHTML anywhere in this file).
//
// useUsersContext() is resolved once here, at the top of the one real component, and threaded
// down as a plain argument through the helper functions below — none of those are components or
// hooks, so they must never call hooks themselves (Rules of Hooks).
export function RichCommentView({
  doc,
  attachments,
}: {
  doc: JSONContent;
  attachments?: CommentAttachment[];
}) {
  const { users } = useUsersContext();
  return (
    <>
      {(doc.content ?? []).map((node, i) => renderBlock(node, users, `b${i}`))}
      {attachments && attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {attachments.map((a, i) => (
            <a
              key={i}
              href={`/api/comments/serve/${encodeURIComponent(a.storagePath)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground hover:bg-muted transition-colors"
              title={`Download ${a.fileName}`}
            >
              <FileText className="size-3 shrink-0 text-muted-foreground" />
              <span className="max-w-[180px] truncate font-medium">{a.fileName}</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}

function renderBlock(node: JSONContent, users: AppUser[], key: string): ReactNode {
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as 1 | 2 | 3) ?? 1;
      const Tag = `h${level}` as "h1" | "h2" | "h3";
      return <Tag key={key}>{renderInlineChildren(node, users, key)}</Tag>;
    }
    case "bulletList":
      return (
        <ul key={key}>
          {(node.content ?? []).map((item, i) => (
            <li key={`${key}-${i}`}>{renderListItemChildren(item, users, `${key}-${i}`)}</li>
          ))}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key}>
          {(node.content ?? []).map((item, i) => (
            <li key={`${key}-${i}`}>{renderListItemChildren(item, users, `${key}-${i}`)}</li>
          ))}
        </ol>
      );
    case "paragraph":
    default:
      return <p key={key}>{renderInlineChildren(node, users, key)}</p>;
  }
}

// A listItem's content is itself a list of block nodes (almost always a single paragraph) —
// render their inline content directly into the <li> rather than nesting a <p>.
function renderListItemChildren(listItem: JSONContent, users: AppUser[], keyPrefix: string): ReactNode {
  return (listItem.content ?? []).map((block, i) => renderInlineChildren(block, users, `${keyPrefix}-${i}`));
}

function renderInlineChildren(node: JSONContent, users: AppUser[], keyPrefix: string): ReactNode[] {
  return (node.content ?? []).map((child, i) => renderInlineNode(child, users, `${keyPrefix}-i${i}`));
}

function renderInlineNode(node: JSONContent, users: AppUser[], key: string): ReactNode {
  if (node.type === "hardBreak") return <br key={key} />;

  if (node.type === "mention") {
    const userId = node.attrs?.id as string | undefined;
    const label = (node.attrs?.label as string | undefined) ?? "";
    const resolvedUser = users.find((u) => u.id === userId);
    return (
      <a
        key={key}
        href={userId ? `/users/${userId}` : undefined}
        className={cn(
          "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
          resolvedUser ? "bg-sky-100 text-sky-700" : "bg-muted text-muted-foreground",
          userId && "cursor-pointer"
        )}
      >
        @{resolvedUser?.name ?? label}
      </a>
    );
  }

  if (node.type === "text") {
    let content: ReactNode = node.text ?? "";
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case "bold":
          content = <strong key={key}>{content}</strong>;
          break;
        case "italic":
          content = <em key={key}>{content}</em>;
          break;
        case "strike":
          content = <del key={key}>{content}</del>;
          break;
        case "link": {
          const href = (mark.attrs?.href as string | undefined) ?? "";
          if (isSafeLinkHref(href)) {
            content = (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:no-underline"
              >
                {content}
              </a>
            );
          }
          break;
        }
        default:
          break;
      }
    }
    return <span key={key}>{content}</span>;
  }

  return null;
}
