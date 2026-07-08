import type { EmailMessage } from "@/lib/email/types";
import { disabledProvider } from "@/lib/email/providers/disabled";
import { resendProvider } from "@/lib/email/providers/resend";
import { microsoftGraphProvider } from "@/lib/email/providers/microsoft-graph";

// Supported values for EMAIL_PROVIDER:
//   disabled         — logs the intent, no external call (default)
//   resend           — Resend SDK (requires RESEND_API_KEY, RESEND_FROM_EMAIL)
//   microsoft_graph  — Microsoft Graph API (requires AZURE_* + GRAPH_FROM_EMAIL)
type SupportedProvider = "disabled" | "resend" | "microsoft_graph";

function getProvider(name: string) {
  switch (name as SupportedProvider) {
    case "resend":         return resendProvider;
    case "microsoft_graph": return microsoftGraphProvider;
    case "disabled":
    default:
      if (name !== "disabled" && name !== "") {
        console.warn(`[email-service] Unknown EMAIL_PROVIDER="${name}" — falling back to disabled`);
      }
      return disabledProvider;
  }
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const providerName = (process.env.EMAIL_PROVIDER ?? "disabled").trim().toLowerCase();
  const provider = getProvider(providerName);
  await provider(message);
}
