import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

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

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
}

/**
 * Outbound email for in-app notifications (US-9.2). No SMTP_HOST configured
 * (the common case in local dev/demo) means this logs instead of sending —
 * a missing mail server shouldn't break the request that triggered the
 * notification, and there's no fake inbox (Mailhog etc.) wired into
 * docker-compose.yml to send to instead.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const client = getTransporter();

  if (!client) {
    // eslint-disable-next-line no-console
    console.log(`[email:not-configured] to=${params.to} subject="${params.subject}"`);
    return;
  }

  try {
    await client.sendMail({ from: env.SMTP_FROM, to: params.to, subject: params.subject, text: params.text });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[email:send-failed] to=${params.to} subject="${params.subject}"`, err);
  }
}
