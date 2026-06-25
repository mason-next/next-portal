// Hand-rolled "markdown-lite" — no npm dependency, just enough syntax for comments:
// **bold**, *italic*, ~~strikethrough~~, [text](url), bulleted/numbered lists, and
// # / ## / ### headings. Deliberately not full CommonMark (no nesting, no blockquotes,
// no code fences) — comments are short chat-style messages, not documents.
//
// Pure parsing only, no React — src/components/shared/MentionText.tsx does the rendering,
// combining these blocks/tokens with mention-pill resolution and URL auto-linking.

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "paragraph"; text: string };

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const UL_RE = /^[-*]\s+(.*)$/;
const OL_RE = /^\d+\.\s+(.*)$/;

export function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const lines = text.split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim() === "") {
      i++;
      continue;
    }

    const heading = HEADING_RE.exec(lines[i]);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2] });
      i++;
      continue;
    }

    if (UL_RE.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && UL_RE.test(lines[i])) {
        items.push(UL_RE.exec(lines[i])![1]);
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (OL_RE.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && OL_RE.test(lines[i])) {
        items.push(OL_RE.exec(lines[i])![1]);
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !HEADING_RE.test(lines[i]) && !UL_RE.test(lines[i]) && !OL_RE.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join("\n") });
  }

  return blocks;
}

export type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "strike"; value: string }
  | { type: "link"; text: string; href: string };

// Bare URLs are deliberately not handled here — "text" tokens get run through the existing
// Linkify component instead, so URL-detection logic (incl. trailing-punctuation stripping)
// lives in exactly one place.
const INLINE_RE = /\*\*([^*]+)\*\*|~~([^~]+)~~|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)/g;

export function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) tokens.push({ type: "text", value: text.slice(lastIndex, index) });

    if (match[1] !== undefined) tokens.push({ type: "bold", value: match[1] });
    else if (match[2] !== undefined) tokens.push({ type: "strike", value: match[2] });
    else if (match[3] !== undefined) tokens.push({ type: "italic", value: match[3] });
    else if (match[4] !== undefined && match[5] !== undefined) tokens.push({ type: "link", text: match[4], href: match[5] });

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) tokens.push({ type: "text", value: text.slice(lastIndex) });
  return tokens;
}

// Guards [text](href) links (and RichCommentView's rendering of rich-editor links) against
// javascript:/data: URIs typed, pasted, or tampered with in storage — only http(s)/mailto links
// render as a real anchor; anything else falls back to plain text.
export function isSafeLinkHref(href: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(href.trim());
}
