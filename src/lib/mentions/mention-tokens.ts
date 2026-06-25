// Legacy comment format: mentions stored inline inside comment text as an ID-bound,
// Markdown-link-style token — `@[Display Name](userId)` — rather than plain `@Name`
// substrings. This survives the mentioned user being renamed or deleted later (the renderer
// resolves the live name by id, falling back to the frozen name here), and has zero ambiguity
// when two mentionable users share a name.
//
// New comments (authored via RichCommentEditor) store mentions as structured nodes in
// ProjectActivity.richContent instead — see lib/mentions/tiptap-mentions.ts. This module stays
// in place to render/extract mentions from every comment posted before that migration, and
// any comment with no token syntax (plain text, no richContent) just renders as-is through the
// same parser — fully additive, no data migration needed.

// NOTE: this regex carries the `g` flag and therefore stateful `lastIndex`. Always go through
// the helpers below (which construct a fresh RegExp per call) rather than reusing this export
// directly with `.exec`/`.test` in a loop.
export const MENTION_TOKEN_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

export interface ParsedMentionToken {
  displayName: string;
  userId: string;
}

export function parseMentionTokens(text: string): ParsedMentionToken[] {
  const matches: ParsedMentionToken[] = [];
  for (const match of text.matchAll(new RegExp(MENTION_TOKEN_REGEX))) {
    matches.push({ displayName: match[1], userId: match[2] });
  }
  return matches;
}

export function extractMentionedUserIds(text: string): string[] {
  return [...new Set(parseMentionTokens(text).map((m) => m.userId))];
}

export function buildMentionToken(name: string, userId: string): string {
  return `@[${name}](${userId})`;
}
