import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch("https://feeds.feedburner.com/TechCrunch", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json([]);
    const xml = await res.text();
    const items: { title: string; link: string; pub: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const inner = match[1];
      const title = inner.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
                    inner.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
      const link = inner.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
      const pub = inner.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
      if (title && link) items.push({ title, link, pub });
    }
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([]);
  }
}
