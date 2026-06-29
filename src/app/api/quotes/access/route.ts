import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.slug || !body?.email) {
    return NextResponse.json({ error: "slug and email required" }, { status: 400 });
  }

  const { slug, email } = body as { slug: string; email: string };

  const quote = await db.quotePresentation.findUnique({
    where: { slug },
    select: { id: true, isActive: true, storageKey: true },
  });

  if (!quote || !quote.isActive) {
    return NextResponse.json({ error: "Presentation not found or no longer available." }, { status: 404 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";

  await db.quoteAccessLog.create({
    data: { quoteId: quote.id, email, ip, userAgent },
  });

  return NextResponse.json({ ok: true, hasFile: !!quote.storageKey });
}
