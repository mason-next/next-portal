import type { RichContent } from "@/types/activity";

// Mentions inserted via RichCommentEditor's Mention extension live as structured
// `{ type: "mention", attrs: { id } }` nodes in the document tree, not as a string pattern to
// regex-match — this walks the tree and collects every mentioned user id, deduped. This is the
// rich-content counterpart to extractMentionedUserIds() in mention-tokens.ts, which remains the
// extractor for legacy plain-string comments.
export function extractMentionedUserIdsFromDoc(doc: RichContent | null | undefined): string[] {
  const ids = new Set<string>();

  function walk(node: RichContent) {
    if (node.type === "mention" && typeof node.attrs?.id === "string") {
      ids.add(node.attrs.id as string);
    }
    node.content?.forEach(walk);
  }

  if (doc) walk(doc);
  return [...ids];
}
