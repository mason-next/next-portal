// Feature flags — controlled via NEXT_PUBLIC_ env vars so they work in both
// client and server components. Embedded at build time by Next.js.
// Set in .env.local during development; remove from production env to disable.

export const ORG_CHART_ENABLED = process.env.NEXT_PUBLIC_ORG_CHART_ENABLED === "true";
