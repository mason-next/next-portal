import type { EmailProvider } from "@/lib/email/types";

// Microsoft Graph email provider — not yet implemented.
//
// Required environment variables (set when this provider is activated):
//   AZURE_TENANT_ID       — Azure AD tenant ID
//   AZURE_CLIENT_ID       — App registration client ID
//   AZURE_CLIENT_SECRET   — App registration client secret
//   GRAPH_FROM_EMAIL      — The mailbox address to send from (must be licensed in the tenant)
//
// Implementation plan:
//   1. Authenticate via @azure/identity ClientSecretCredential
//   2. POST to https://graph.microsoft.com/v1.0/users/{GRAPH_FROM_EMAIL}/sendMail
//   3. Body: { message: { subject, body: { contentType: "HTML", content: html }, toRecipients: [...] } }
export const microsoftGraphProvider: EmailProvider = async ({ to, subject }) => {
  // Placeholder — remove this error and implement the Graph call when ready.
  throw new Error(
    `Microsoft Graph email provider is not yet implemented. ` +
    `Would have sent "${subject}" to <${to}>. ` +
    `Set EMAIL_PROVIDER=disabled to suppress this error until implementation is complete.`
  );
};
