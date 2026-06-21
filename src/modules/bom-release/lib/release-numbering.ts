import type { Release } from "@/types/release";

// Releases are created strictly in order and never deleted, so the next number is just
// a count — no string-parsing of labels (plan §9.1: releaseId is the canonical FK).
export function nextReleaseNumber(releases: Release[]): string {
  return `Release ${releases.length + 1}`;
}

// A "draft" release has been assigned to at least one row but not yet generated —
// generatedAt is empty until "Generate Release" runs.
export function isDraftRelease(release: Release): boolean {
  return !release.generatedAt;
}
