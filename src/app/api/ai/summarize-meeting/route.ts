import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { getAnthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";

export interface MeetingSummary {
  title: string;
  summary: string;
  decisions: string[];
  actionItems: Array<{ action: string; owner?: string; dueDate?: string }>;
  risks: string[];
  followUps: string[];
}

const SYSTEM_PROMPT = `You are a professional meeting analyst. Given a raw meeting transcript, extract structured information and return it as valid JSON matching this exact schema:

{
  "title": "string — concise descriptive title for the meeting",
  "summary": "string — 3-5 sentence overview of what was discussed and accomplished",
  "decisions": ["string", ...],
  "actionItems": [{ "action": "string", "owner": "string or omit if unknown", "dueDate": "string or omit if not mentioned" }, ...],
  "risks": ["string", ...],
  "followUps": ["string", ...]
}

Rules:
- Return ONLY valid JSON, no markdown fences, no explanation.
- If a section has no items, return an empty array [].
- Be specific and actionable — avoid vague generalities.
- Preserve speaker attribution in actionItems when a clear owner is mentioned.`;

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  let transcript: string;
  try {
    const body = await req.json();
    transcript = body?.transcript;
    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "transcript (string) is required" }, { status: 400 });
    }
    if (transcript.length > 200_000) {
      return NextResponse.json({ error: "Transcript too long (max 200k characters)" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze this meeting transcript:\n\n${transcript}`,
        },
      ],
    });

    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    let summary: MeetingSummary;
    try {
      summary = JSON.parse(raw);
    } catch {
      console.error("[summarize-meeting] Claude returned non-JSON:", raw);
      return NextResponse.json({ error: "Failed to parse model response" }, { status: 502 });
    }

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[summarize-meeting] Anthropic error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
