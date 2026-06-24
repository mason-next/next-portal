// Mentions are stored inline inside comment text as an ID-bound, Markdown-link-style
// token — `@[Display Name](userId)` — rather than plain `@Name` substrings. This survives
// the mentioned user being renamed or deleted later (the renderer resolves the live name by
// id, falling back to the frozen name here), and has zero ambiguity when two mentionable
// users share a name. Comments with no token syntax (all historical comments) just render
// as plain text through the same parser — fully additive, no migration needed.

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

export interface ActiveMentionTrigger {
  query: string;
  triggerStart: number;
}

// Scans backward from the caret for an "@" that starts a mention-in-progress: it must sit at
// the start of the text or be preceded by whitespace/newline (so "foo@bar" never triggers —
// only a genuine word-boundary "@" does), and there must be no whitespace between it and the
// caret (otherwise the user has already moved past whatever they were typing). Re-derived
// fresh from the current text + caret on every keystroke rather than tracked as a boolean, so
// backspacing through the "@", moving the caret away, etc. all "just work" with no extra cases.
export function detectActiveTrigger(text: string, caretIndex: number): ActiveMentionTrigger | null {
  const upToCaret = text.slice(0, caretIndex);
  const at = upToCaret.lastIndexOf("@");
  if (at === -1) return null;

  const before = at === 0 ? "" : text[at - 1];
  if (before && !/\s/.test(before)) return null;

  const query = upToCaret.slice(at + 1);
  if (/\s/.test(query)) return null;

  return { query, triggerStart: at };
}

export interface MentionInsertResult {
  text: string;
  caretIndex: number;
}

// Splices a finished mention token (plus a trailing space) in place of the in-progress
// "@query" substring sitting between triggerStart and caretIndex.
export function insertMentionToken(
  text: string,
  triggerStart: number,
  caretIndex: number,
  name: string,
  userId: string
): MentionInsertResult {
  const token = `${buildMentionToken(name, userId)} `;
  const next = text.slice(0, triggerStart) + token + text.slice(caretIndex);
  return { text: next, caretIndex: triggerStart + token.length };
}
