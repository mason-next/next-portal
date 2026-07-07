// Extracts plain text from a WebVTT (.vtt) transcript file.
// Strips the WEBVTT header, cue timestamps, NOTE blocks, and blank lines.
// Preserves speaker labels if present (e.g. "John: Hello everyone").

const TIMESTAMP_RE = /^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/;
const CUE_SETTING_RE = /^\s*(align|line|position|size|vertical):/;

export interface VttParseResult {
  lines: string[];
  text: string;
  wordCount: number;
}

export function parseVtt(content: string): VttParseResult {
  const rawLines = content.split(/\r?\n/);
  const lines: string[] = [];
  let inNote = false;

  for (const raw of rawLines) {
    const line = raw.trim();

    // Skip the file header
    if (line === "WEBVTT" || line.startsWith("WEBVTT ")) continue;
    // Skip cue IDs that are purely numeric or UUID-like (no spaces, not speaker text)
    if (/^[\w-]+$/.test(line) && !line.includes(":")) continue;
    // Skip timestamp lines
    if (TIMESTAMP_RE.test(line)) continue;
    // Skip cue settings on the same line as a timestamp (shouldn't appear alone, but defensive)
    if (CUE_SETTING_RE.test(line)) continue;
    // Skip NOTE blocks
    if (line.startsWith("NOTE")) { inNote = true; continue; }
    if (inNote && line === "") { inNote = false; continue; }
    if (inNote) continue;
    // Skip STYLE and REGION blocks (simple version: skip until blank line)
    if (line.startsWith("STYLE") || line.startsWith("REGION")) continue;
    // Skip blank lines
    if (line === "") continue;

    lines.push(line);
  }

  const text = lines.join("\n");
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return { lines, text, wordCount };
}
