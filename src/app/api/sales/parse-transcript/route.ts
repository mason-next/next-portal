import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ACTIVITY_TYPES = ["Call", "Email", "Meeting", "Research", "Demo", "Proposal", "Other"] as const;
const OPP_STAGES = ["Prospecting", "Qualifying", "Proposal", "Negotiation", "Closed Won", "Closed Lost"] as const;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI service is not configured. Contact your administrator (ANTHROPIC_API_KEY missing)." },
      { status: 503 }
    );
  }

  let body: { transcript?: string; reps?: string; companies?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { transcript, reps, companies } = body;
  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return NextResponse.json({ error: "transcript is required." }, { status: 400 });
  }

  const companiesJson = JSON.stringify(companies ?? [], null, 2);
  const prompt = `You are a sales operations assistant. Extract structured activity notes from the transcript below.

SALES REP(S) ON THIS CALL: ${reps ?? "unknown"}

EXISTING CRM COMPANIES AND OPPORTUNITIES:
${companiesJson}

TRANSCRIPT:
${transcript}

---

Instructions:
- Identify every company discussed in the transcript.
- For each company, produce one JSON object in the "items" array.
- Match company names to the CRM list above (fuzzy match is fine). Set companyId to the matched id, or null if new.
- Match opportunity names to the CRM list. Set opportunityId to the matched id, or null if new.
- activityType must be one of: ${ACTIVITY_TYPES.join(", ")}
- suggestedStage must be one of: ${OPP_STAGES.join(", ")} — or null if no stage is apparent.
- activityDate: the date the interaction took place in YYYY-MM-DD format, or null if not mentioned.
- contacts: people from the customer side mentioned (not the sales rep). Include name and title if mentioned.
- summary: 2–3 sentences describing what was discussed and the outcome.
- actionItems: concrete next steps mentioned, one per array entry. Empty array if none.

Return ONLY valid JSON — no markdown, no explanation — in this exact shape:
{
  "items": [
    {
      "companyName": "string",
      "companyId": "string or null",
      "isNewCompany": true or false,
      "opportunityName": "string or null",
      "opportunityId": "string or null",
      "isNewOpportunity": true or false,
      "activityType": "one of the allowed types",
      "activityDate": "YYYY-MM-DD or null",
      "suggestedStage": "one of the allowed stages or null",
      "contacts": [{ "name": "string", "title": "string" }],
      "summary": "string",
      "actionItems": ["string"]
    }
  ]
}`;

  const client = new Anthropic({ apiKey });

  let rawText: string;
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content[0];
    rawText = block.type === "text" ? block.text : "";
  } catch (err) {
    console.error("[parse-transcript] Anthropic API error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `AI request failed: ${msg}` },
      { status: 502 }
    );
  }

  // Strip markdown code fences if Claude wrapped the response
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: { items: unknown[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[parse-transcript] Non-JSON response from Claude:", rawText.slice(0, 300));
    return NextResponse.json(
      { error: "AI returned an unexpected response format. Please try again." },
      { status: 500 }
    );
  }

  if (!Array.isArray(parsed?.items)) {
    return NextResponse.json(
      { error: "AI response missing expected structure. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ items: parsed.items });
}
