"use client";

import type { ReactNode } from "react";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { Linkify } from "@/components/shared/Linkify";
import { MENTION_TOKEN_REGEX } from "@/lib/mentions/mention-tokens";
import { cn } from "@/lib/utils";

// Splits comment text on mention tokens first, then runs Linkify (URL detection) over each
// plain-text segment in between — so a comment can contain both a mention and a URL without
// merging the two concerns into one component.
export function MentionText({ text }: { text: string }) {
  const { users } = useUsersContext();
  const parts = text.split(new RegExp(MENTION_TOKEN_REGEX));
  // String.split with a capturing-group regex interleaves: [plain, name, id, plain, name, id, ...]
  const nodes: ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    const plain = parts[i];
    if (plain) nodes.push(<Linkify key={`t${i}`} text={plain} />);

    const name = parts[i + 1];
    const userId = parts[i + 2];
    if (name === undefined || userId === undefined) continue;

    const resolvedUser = users.find((u) => u.id === userId);
    nodes.push(
      <span
        key={`m${i}`}
        className={cn(
          "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium",
          resolvedUser ? "bg-sky-100 text-sky-700" : "bg-muted text-muted-foreground"
        )}
      >
        @{resolvedUser?.name ?? name}
      </span>
    );
  }

  return <>{nodes}</>;
}
