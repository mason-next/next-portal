export interface EmailContact {
  role: string;
  name: string;
  blurb?: string;
  avatarUrl?: string | null;
}

export interface EmailSection {
  heading: string;
  intro?: string;
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
