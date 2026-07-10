export interface EmailContact {
  role: string;
  name: string;
  blurb?: string;
  avatarUrl?: string | null;
  // When present, the avatar is served via the public /api/email-assets/avatar/[userId]
  // endpoint instead of the raw avatarUrl — required for Outlook compatibility since
  // Outlook blocks base64 data: URLs in email HTML.
  userId?: string | null;
}

// A labeled progress bar row, e.g. for status/progress-style reports — renders as an
// Outlook-safe two-cell table bar (see engine/render.ts renderStatRow), not a CSS width%.
export interface EmailStatRow {
  label: string;
  percent: number; // 0-100
}

export interface EmailSection {
  heading: string;
  intro?: string;
  stats?: EmailStatRow[];
  notes?: string[]; // rendered as plain bullet lines
  contacts?: EmailContact[];
}

export interface EmailTemplateContent {
  greeting: string; // headline text, rendered as an <h1>
  intro: string[];
  ctaLabel?: string;
  ctaHref?: string;
  sections: EmailSection[];
  closing: string[];
  signOffLine: string;
  signatureLines: string[];
  footerTagline?: string;
  footerPillars?: string[];
}
