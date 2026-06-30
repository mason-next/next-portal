import { NextResponse } from "next/server";

export const revalidate = 3600;

const FOUR_MONTHS_MS = 4 * 30 * 24 * 60 * 60 * 1000;

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

export async function GET() {
  try {
    const res = await fetch("https://techcrunch.com/feed/", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json([]);
    const xml = await res.text();
    const cutoff = Date.now() - FOUR_MONTHS_MS;
    const items: { title: string; link: string; pub: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const inner = match[1];
      const rawTitle = inner.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
                       inner.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
      const title = decodeEntities(rawTitle);
      const link = inner.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
      const pub = inner.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
      if (!title || !link) continue;
      if (pub) {
        const age = Date.parse(pub);
        if (!isNaN(age) && age < cutoff) continue;
      }
      items.push({ title, link, pub });
    }
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([]);
  }
}
