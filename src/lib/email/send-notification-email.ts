import { sendEmail } from "@/lib/email/email-service";
import type { NewNotificationInput } from "@/types/notification";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

// ─── Deep links ───────────────────────────────────────────────────────────────

function buildProjectUrl(input: NewNotificationInput): string {
  const base = APP_URL || "";
  // Task comment mentions → implementation tab; project comment mentions → project root.
  const path = input.taskCommentId
    ? `/projects/${input.projectId}/implementation`
    : `/projects/${input.projectId}`;
  return `${base}${path}`;
}

// ─── Templates ────────────────────────────────────────────────────────────────

function mentionEmailHtml(params: {
  recipientName: string;
  authorName: string;
  projectName: string;
  commentPreview: string;
  projectUrl: string;
}): string {
  const { recipientName, authorName, projectName, commentPreview, projectUrl } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#1e293b;padding:24px 32px;">
            <p style="margin:0;color:#94a3b8;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">NEXT Operations Portal</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">You were mentioned</p>
            <p style="margin:0 0 24px;font-size:15px;color:#64748b;">
              Hi ${recipientName}, <strong style="color:#0f172a;">${authorName}</strong> mentioned you in <strong style="color:#0f172a;">${projectName}</strong>.
            </p>
            <!-- Comment preview -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="border-left:3px solid #6366f1;padding:12px 16px;background:#f8fafc;border-radius:0 4px 4px 0;">
                  <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">${commentPreview}</p>
                </td>
              </tr>
            </table>
            <!-- CTA -->
            <a href="${projectUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;">View Comment →</a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              You received this because you were @mentioned. Reply directly in the portal to respond.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export async function sendNotificationEmail(
  input: NewNotificationInput,
  recipientEmail: string,
  recipientName: string
): Promise<void> {
  // Only mention emails are implemented — extend this for other types as needed.
  if (input.type !== "mention") return;

  await sendEmail({
    to: recipientEmail,
    subject: `[${input.projectName}] — ${input.commentAuthor ?? "Someone"} mentioned you`,
    html: mentionEmailHtml({
      recipientName,
      authorName: input.commentAuthor ?? "Someone",
      projectName: input.projectName,
      commentPreview: input.commentPreview ?? input.message,
      projectUrl: buildProjectUrl(input),
    }),
  });
}
