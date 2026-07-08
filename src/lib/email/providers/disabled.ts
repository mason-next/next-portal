import type { EmailProvider } from "@/lib/email/types";

// No-op provider used when EMAIL_PROVIDER=disabled (the default).
// Logs the intent so developers can confirm the notification pipeline fired
// without sending anything externally.
export const disabledProvider: EmailProvider = async ({ to, subject }) => {
  console.log(
    `[email] EMAIL_PROVIDER=disabled — would have sent "${subject}" to <${to}>`
  );
};
