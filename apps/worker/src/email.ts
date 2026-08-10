import nodemailer, { Transporter } from "nodemailer";
import { env } from "./config/env";

// Mirrors apps/api's utils/email.ts — kept as a separate copy so this app
// can build/deploy independently (same rationale as notify.ts).
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildNotificationEmail(params: {
  title: string;
  body: string;
  linkUrl?: string;
  linkLabel?: string;
}): { text: string; html: string } {
  const text = params.linkUrl ? `${params.body}\n\n${params.linkUrl}` : params.body;
  const safeTitle = escapeHtml(params.title);
  const safeBody = escapeHtml(params.body).replace(/\n/g, "<br />");
  const cta =
    params.linkUrl
      ? `<p style="margin:24px 0 0">
          <a href="${escapeHtml(params.linkUrl)}"
             style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">
            ${escapeHtml(params.linkLabel ?? "Open in dashboard")}
          </a>
        </p>
        <p style="margin:12px 0 0;font-size:12px;color:#64748b;word-break:break-all">${escapeHtml(params.linkUrl)}</p>`
      : "";

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px 24px">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#16a34a">ibTech</p>
              <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#0f172a">${safeTitle}</h1>
              <p style="margin:0;font-size:15px;line-height:1.55;color:#334155">${safeBody}</p>
              ${cta}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { text, html };
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const client = getTransporter();
  if (!client) {
    // eslint-disable-next-line no-console
    console.log(`[email:not-configured] to=${params.to} subject="${params.subject}"`);
    return;
  }
  try {
    await client.sendMail({
      from: env.SMTP_FROM,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[email:send-failed] to=${params.to} subject="${params.subject}"`, err);
  }
}
