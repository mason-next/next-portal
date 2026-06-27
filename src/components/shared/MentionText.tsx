"use client";

import type { ReactNode } from "react";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { Linkify } from "@/components/shared/Linkify";
import { MENTION_TOKEN_REGEX } from "@/lib/mentions/mention-tokens";
import { isSafeLinkHref, parseInlineTokens, parseMarkdownBlocks } from "@/lib/richtext/markdown";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";

const HEADING_CLASS: Record<1 | 2 | 3, string> = {
  1: "text-base font-bold",
  2: "text-sm font-bold",
  3: "text-sm font-semibold",
};

// Renders stored comment text as rich text: markdown-lite blocks (headings, lists,
// paragraphs) with inline bold/italic/strikethrough/links, mention pills, and auto-linked
// bare URLs. Comments with none of this syntax (every historical comment) render exactly as
// before — a single plain paragraph.
export function MentionText({ text }: { text: string }) {
  const { users } = useUsersContext();
  const blocks = parseMarkdownBlocks(text);

  return (
    <>
      {blocks.map((block, i) => {
        const key = `b${i}`;
        switch (block.type) {
          case "heading": {
            const Tag = `h${block.level}` as "h1" | "h2" | "h3";
            return (
              <Tag key={key} className={cn("mt-1.5 first:mt-0", HEADING_CLASS[block.level])}>
                {renderInline(block.text, users, key)}
              </Tag>
            );
          }
          case "ul":
            return (
              <ul key={key} className="mt-1 list-disc space-y-0.5 pl-5 text-sm first:mt-0">
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`}>{renderInline(item, users, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="mt-1 list-decimal space-y-0.5 pl-5 text-sm first:mt-0">
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`}>{renderInline(item, users, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
          case "paragraph":
          default:
            return (
              <p key={key} className="mt-1 whitespace-pre-wrap text-sm first:mt-0">
                {renderInline(block.text, users, key)}
              </p>
            );
        }
      })}
    </>
  );
}

// Mention tokens are resolved first (coarse split, same as before this feature) so markdown
// inline parsing never sees the "@[Name](id)" syntax — it has no leading "@" to be confused
// with a plain [text](url) link.
function renderInline(text: string, users: AppUser[], keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const parts = text.split(new RegExp(MENTION_TOKEN_REGEX));

  for (let i = 0; i < parts.length; i += 3) {
    const plain = parts[i];
    if (plain) nodes.push(...renderMarkdownSegment(plain, `${keyPrefix}-t${i}`));

    const name = parts[i + 1];
    const userId = parts[i + 2];
    if (name === undefined || userId === undefined) continue;

    const resolvedUser = users.find((u) => u.id === userId);
    nodes.push(
      <a
        key={`${keyPrefix}-m${i}`}
        href={userId ? `/users/${userId}` : undefined}
        className={cn(
          "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
          resolvedUser ? "bg-sky-100 text-sky-700" : "bg-muted text-muted-foreground",
          userId && "cursor-pointer"
        )}
      >
        @{resolvedUser?.name ?? name}
      </a>
    );
  }

  return nodes;
}

function renderMarkdownSegment(text: string, keyPrefix: string): ReactNode[] {
  return parseInlineTokens(text).map((token, i) => {
    const key = `${keyPrefix}-i${i}`;
    switch (token.type) {
      case "bold":
        return <strong key={key}>{token.value}</strong>;
      case "italic":
        return <em key={key}>{token.value}</em>;
      case "strike":
        return <del key={key}>{token.value}</del>;
      case "link":
        return isSafeLinkHref(token.href) ? (
          <a
            key={key}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:no-underline"
          >
            {token.text}
          </a>
        ) : (
          <Linkify key={key} text={token.text} />
        );
      case "text":
      default:
        return <Linkify key={key} text={token.value} />;
    }
  });
}
