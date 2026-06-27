"use server";

import { db } from "@/lib/db";
import type { QuotePresentation, QuoteAccessLog } from "@/types/sales";
import type { QuotePresentation as PrismaQuote } from "@prisma/client";

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toQuote(
  r: PrismaQuote & { _count?: { accessLogs: number }; uniqueVisitors?: number; lastAccessed?: Date | null }
): QuotePresentation {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    customer: r.customer,
    isActive: r.isActive,
    htmlFile: r.htmlFile,
    storageKey: r.storageKey,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    totalViews: r._count?.accessLogs,
    uniqueVisitors: r.uniqueVisitors,
    lastAccessed: r.lastAccessed?.toISOString() ?? null,
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getQuotePresentations(): Promise<QuotePresentation[]> {
  const rows = await db.quotePresentation.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { accessLogs: true } } },
  });
  return rows.map(toQuote);
}

export async function getQuotePresentation(slug: string): Promise<QuotePresentation | null> {
  const row = await db.quotePresentation.findUnique({
    where: { slug },
    include: { _count: { select: { accessLogs: true } } },
  });
  return row ? toQuote(row) : null;
}

export async function getQuotePresentationById(id: string): Promise<QuotePresentation | null> {
  const row = await db.quotePresentation.findUnique({
    where: { id },
    include: { _count: { select: { accessLogs: true } } },
  });
  return row ? toQuote(row) : null;
}

export async function getQuoteAccessLogs(quoteId: string): Promise<QuoteAccessLog[]> {
  const rows = await db.quoteAccessLog.findMany({
    where: { quoteId },
    orderBy: { accessedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    quoteId: r.quoteId,
    email: r.email,
    ip: r.ip,
    userAgent: r.userAgent,
    accessedAt: r.accessedAt.toISOString(),
  }));
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createQuotePresentation(data: {
  slug: string;
  title: string;
  customer: string;
  createdBy: string;
  htmlFile?: string;
  storageKey?: string;
}): Promise<QuotePresentation> {
  const row = await db.quotePresentation.create({
    data: {
      slug: data.slug,
      title: data.title,
      customer: data.customer,
      createdBy: data.createdBy,
      htmlFile: data.htmlFile ?? "presentation.html",
      storageKey: data.storageKey ?? "",
    },
    include: { _count: { select: { accessLogs: true } } },
  });
  return toQuote(row);
}

export async function toggleQuoteActive(id: string): Promise<void> {
  const current = await db.quotePresentation.findUnique({ where: { id }, select: { isActive: true } });
  if (!current) return;
  await db.quotePresentation.update({ where: { id }, data: { isActive: !current.isActive } });
}

export async function deleteQuotePresentation(id: string): Promise<void> {
  await db.quotePresentation.delete({ where: { id } });
}

export async function logQuoteAccess(
  slug: string,
  email: string
): Promise<{ quoteId: string; htmlFile: string; storageKey: string }> {
  const quote = await db.quotePresentation.findUnique({
    where: { slug },
    select: { id: true, isActive: true, htmlFile: true, storageKey: true },
  });
  if (!quote || !quote.isActive) throw new Error("Presentation not found or no longer available.");
  await db.quoteAccessLog.create({ data: { quoteId: quote.id, email, ip: "", userAgent: "" } });
  return { quoteId: quote.id, htmlFile: quote.htmlFile, storageKey: quote.storageKey };
}
