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

export async function sendEmail(params: { to: string; subject: string; text: string }): Promise<void> {
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
