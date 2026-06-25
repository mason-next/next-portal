import type { EmailContact, EmailSection, EmailStatRow, EmailTemplateContent } from "./types";

const LOGO_PATH = "/logo-white.png";

// Relative paths only resolve while the HTML is viewed inside this app's own origin (the
// preview iframe). Once it's copied into an Outlook draft or any other client, there's no
// page origin to resolve against, so the logo silently fails to load — it needs an absolute
// URL pointing back at wherever this app is actually hosted.
function resolveAssetUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}
const PAGE_BG = "#f5f5f5";
const BANNER_BG = "#252525";
const CARD_BORDER = "#111111";
const H1_COLOR = "#333333";
const INTRO_TEXT_COLOR = "#111111";
const SECTION_HEADING_COLOR = "#111111";
const NAME_COLOR = "#2f2f2f";
const ROLE_COLOR = "#111111";
const BLURB_COLOR = "#666666";
const CLOSING_TEXT_COLOR = "#666666";
const SIGNOFF_COLOR = "#333333";
const FOOTER_LABEL_COLOR = "#777777";
const FOOTER_PILLAR_COLOR = "#999999";
const FOOTER_BORDER = "#eeeeee";
const DIVIDER_COLOR = "#bdbdbd";
const AVATAR_BORDER = "#dddddd";
const BAR_LABEL_COLOR = "#111111";
const BAR_VALUE_COLOR = "#666666";
const BAR_TRACK_BG = "#eeeeee";
const BAR_FILL_BG = "#111111";
// Outlook's Word rendering engine doesn't reliably honor percentage table-cell widths, so the
// bar is a fixed-px two-cell table instead of CSS width:%.
const BAR_WIDTH_PX = 300;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c] as string
  );
}

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

// Outlook desktop (the Word rendering engine) ignores CSS border-radius entirely, on both
// <img> and <div> — the only way to get an actually-round avatar there is VML. Every avatar
// renders twice: a <v:oval> for mso, and the normal CSS version for every other client.
function renderAvatar(contact: EmailContact): string {
  const size = 52;
  if (contact.avatarUrl) {
    const url = escapeHtml(contact.avatarUrl);
    return `<!--[if mso]>
        <v:oval style="width:${size}px;height:${size}px;" strokecolor="${AVATAR_BORDER}" strokeweight="1px" fillcolor="none">
          <v:fill type="frame" src="${url}" />
        </v:oval>
        <![endif]-->
        <!--[if !mso]><!-->
        <img src="${url}" width="${size}" height="${size}" alt="${escapeHtml(contact.name)}" style="display:block; width:${size}px; height:${size}px; border-radius:50%; border:1px solid ${AVATAR_BORDER}; object-fit:cover;" />
        <!--<![endif]-->`;
  }
  const initials = escapeHtml(initialsOf(contact.name));
  return `<!--[if mso]>
      <v:oval style="width:${size}px;height:${size}px;" strokecolor="none" fillcolor="#334155">
        <v:textbox inset="0,0,0,0">
          <center style="font-family:Arial, Helvetica, sans-serif; font-size:18px; font-weight:bold; color:#ffffff;">${initials}</center>
        </v:textbox>
      </v:oval>
      <![endif]-->
      <!--[if !mso]><!-->
      <div style="width:${size}px; height:${size}px; border-radius:50%; overflow:hidden; background:linear-gradient(135deg,#cbd5e1,#334155); color:#ffffff; font-size:18px; font-weight:bold; text-align:center; line-height:${size}px; font-family:Arial, Helvetica, sans-serif;">${initials}</div>
      <!--<![endif]-->`;
}

function renderContactRow(contact: EmailContact, isLast: boolean): string {
  const spacer = isLast
    ? ""
    : `<tr><td colspan="2" height="30" style="height:30px; line-height:30px; font-size:30px;">&nbsp;</td></tr>`;
  return `<tr>
        <td width="72" valign="top" style="width:72px; padding:2px 20px 0 0;">${renderAvatar(contact)}</td>
        <td valign="top" style="padding:0;">
          <p style="margin:0 0 6px 0; font-size:15px; line-height:1.35; font-weight:bold; color:${NAME_COLOR};">${escapeHtml(contact.name)}</p>
          <p style="margin:0 0 12px 0; font-size:13px; line-height:1.35; color:${ROLE_COLOR};">${escapeHtml(contact.role)}</p>
          <p style="margin:0; font-size:13px; line-height:1.65; color:${BLURB_COLOR};">${escapeHtml(contact.blurb ?? "")}</p>
        </td>
      </tr>${spacer}`;
}

function renderStatRow(stat: EmailStatRow, isLast: boolean): string {
  const clamped = Math.min(100, Math.max(0, stat.percent));
  const filled = Math.round((BAR_WIDTH_PX * clamped) / 100);
  const remaining = BAR_WIDTH_PX - filled;
  const spacer = isLast ? "" : `<tr><td height="16" style="height:16px; line-height:16px; font-size:16px;">&nbsp;</td></tr>`;
  return `<tr>
        <td style="padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
            <tr>
              <td style="font-size:13px; color:${BAR_LABEL_COLOR}; padding:0 0 6px 0;">${escapeHtml(stat.label)}</td>
              <td align="right" style="font-size:13px; color:${BAR_VALUE_COLOR}; padding:0 0 6px 0;">${Math.round(clamped)}%</td>
            </tr>
          </table>
          <table role="presentation" width="${BAR_WIDTH_PX}" cellpadding="0" cellspacing="0" style="width:${BAR_WIDTH_PX}px; border-collapse:collapse;">
            <tr>
              ${filled > 0 ? `<td width="${filled}" height="8" style="width:${filled}px; height:8px; background-color:${BAR_FILL_BG}; font-size:0; line-height:0;">&nbsp;</td>` : ""}
              ${remaining > 0 ? `<td width="${remaining}" height="8" style="width:${remaining}px; height:8px; background-color:${BAR_TRACK_BG}; font-size:0; line-height:0;">&nbsp;</td>` : ""}
            </tr>
          </table>
        </td>
      </tr>${spacer}`;
}

function renderNotes(notes: string[]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
      ${notes
        .map(
          (note, i) =>
            `<tr><td style="padding:${i === 0 ? "0" : "6"}px 0 0 0; font-size:13px; line-height:1.5; color:${BLURB_COLOR};">• ${escapeHtml(note)}</td></tr>`
        )
        .join("\n")}
    </table>`;
}

function renderSectionRow(section: EmailSection, isFirst: boolean): string {
  const divider = isFirst
    ? ""
    : `<tr><td style="border-top:1px solid ${DIVIDER_COLOR}; height:0; line-height:0; font-size:0;">&nbsp;</td></tr>`;
  const hasMoreBelowIntro = Boolean(section.stats?.length || section.notes?.length || section.contacts?.length);
  const intro = section.intro
    ? `<p style="font-size:13px; line-height:1.5; color:${BLURB_COLOR}; margin:0 0 ${hasMoreBelowIntro ? "20" : "0"}px 0;">${escapeHtml(section.intro)}</p>`
    : "";
  const hasMoreBelowStats = Boolean(section.notes?.length || section.contacts?.length);
  const stats = section.stats?.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse; margin:0 0 ${hasMoreBelowStats ? "20" : "0"}px 0;">
        ${section.stats.map((s, i) => renderStatRow(s, i === section.stats!.length - 1)).join("\n")}
      </table>`
    : "";
  const notes = section.notes?.length
    ? `<div style="margin:0 0 ${section.contacts?.length ? "20" : "0"}px 0;">${renderNotes(section.notes)}</div>`
    : "";
  const contacts = section.contacts?.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
        ${section.contacts.map((c, i) => renderContactRow(c, i === section.contacts!.length - 1)).join("\n")}
      </table>`
    : "";

  return `${divider}
      <tr>
        <td style="padding:30px 28px 34px 28px;">
          <h2 style="font-size:16px; line-height:1.3; margin:0 0 30px 0; color:${SECTION_HEADING_COLOR}; font-weight:bold;">${escapeHtml(section.heading)}</h2>
          ${intro}
          ${stats}
          ${notes}
          ${contacts}
        </td>
      </tr>`;
}

export function renderEmailHtml(content: EmailTemplateContent): string {
  const introParagraphs = content.intro
    .map(
      (p, i, arr) =>
        `<p style="font-size:15px; line-height:1.65; margin:0 0 ${i === arr.length - 1 ? "0" : "14"}px 0; color:${INTRO_TEXT_COLOR};">${escapeHtml(p)}</p>`
    )
    .join("\n");

  const cta = content.ctaLabel
    ? `<a href="${content.ctaHref ?? "#"}" style="display:inline-block; background-color:${CARD_BORDER}; color:#ffffff; text-decoration:none; font-size:13px; padding:12px 28px; margin-top:18px;">
                ${escapeHtml(content.ctaLabel)}
              </a>`
    : "";

  const sectionRows = content.sections.map((section, i) => renderSectionRow(section, i === 0)).join("\n");

  const closingParagraphs = content.closing
    .map(
      (p, i, arr) =>
        `<p style="font-size:14px; line-height:1.7; color:${CLOSING_TEXT_COLOR}; margin:0 0 ${i === arr.length - 1 ? "26" : "16"}px 0;">${escapeHtml(p)}</p>`
    )
    .join("\n");

  const signature = content.signatureLines.length
    ? `<br /><br />${content.signatureLines.map((line) => escapeHtml(line)).join("<br />")}`
    : "<br />";

  const footer = content.footerTagline
    ? `<tr>
            <td style="padding:24px 44px 30px 44px; border-top:1px solid ${FOOTER_BORDER};">
              <p style="font-size:12px; color:${FOOTER_LABEL_COLOR}; margin:0 0 10px 0; font-weight:bold;">
                ${escapeHtml(content.footerTagline)}
              </p>
              ${
                content.footerPillars?.length
                  ? `<p style="font-size:12px; color:${FOOTER_PILLAR_COLOR}; margin:0;">${content.footerPillars
                      .map((pillar) => escapeHtml(pillar))
                      .join(" &nbsp; | &nbsp; ")}</p>`
                  : ""
              }
            </td>
          </tr>`
    : "";

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(content.greeting)}</title>
<!--[if mso]>
<style>
v\\:* {behavior:url(#default#VML);}
o\\:* {behavior:url(#default#VML);}
</style>
<![endif]-->
</head>
<body style="margin:0; padding:0; background-color:${PAGE_BG}; font-family:Arial, Helvetica, sans-serif; color:#222222;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${PAGE_BG}; padding:24px 0 32px 0; border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table width="700" cellpadding="0" cellspacing="0" role="presentation" style="width:700px; min-width:700px; background-color:#ffffff; border-collapse:collapse;">

          <tr>
            <td align="center" style="background-color:${BANNER_BG}; padding:26px 36px 24px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <img
                      src="${resolveAssetUrl(LOGO_PATH)}"
                      alt="Mason Technologies"
                      width="170"
                      style="display:block; border:0; width:170px; height:auto;"
                    />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:34px 44px 24px 44px;">
              <h1 style="margin:0 0 24px 0; font-size:24px; line-height:1.25; color:${H1_COLOR}; font-weight:bold;">
                ${escapeHtml(content.greeting)}
              </h1>
              ${introParagraphs}
              ${cta}
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 34px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid ${CARD_BORDER}; border-collapse:collapse;">
                ${sectionRows}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 44px 34px 44px;">
              ${closingParagraphs}
              <p style="font-size:14px; line-height:1.6; color:${SIGNOFF_COLOR}; margin:0;">
                ${escapeHtml(content.signOffLine)}${signature}
              </p>
            </td>
          </tr>

          ${footer}

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

export function renderEmailPlainText(content: EmailTemplateContent, subject: string): string {
  const sections = content.sections
    .map((section) => {
      const statLines = section.stats?.map((s) => `${s.label}: ${Math.round(s.percent)}%`).join("\n") ?? "";
      const noteLines = section.notes?.map((n) => `• ${n}`).join("\n") ?? "";
      const contactLines =
        section.contacts
          ?.map((c) => `${c.role}\n${c.name}${c.blurb ? `\n${c.blurb}` : ""}`)
          .join("\n\n") ?? "";
      return [section.heading.toUpperCase(), section.intro, statLines, noteLines, contactLines]
        .filter(Boolean)
        .join("\n\n");
    })
    .join("\n\n");

  return [
    `Subject: ${subject}`,
    "",
    content.greeting,
    "",
    content.intro.join("\n\n"),
    "",
    sections,
    "",
    content.closing.join("\n\n"),
    "",
    content.signOffLine,
    content.signatureLines.join("\n"),
    "",
    content.footerTagline ?? "",
    content.footerPillars?.join(" | ") ?? "",
  ]
    .filter((line) => line !== undefined && line !== null)
    .join("\n");
}
