import type { EmailProvider } from "@/lib/email/types";

// Resend-backed provider. Requires RESEND_API_KEY and RESEND_FROM_EMAIL.
// Not the active default — see email-service.ts for provider selection.
// Preserved here so it can be re-activated by setting EMAIL_PROVIDER=resend
// if Microsoft Graph integration is delayed or unavailable.
export const resendProvider: EmailProvider = async ({ to, subject, html, text }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "NEXT Portal <notifications@next-portal.app>";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) throw new Error(`Resend error: ${error.message}`);
};
