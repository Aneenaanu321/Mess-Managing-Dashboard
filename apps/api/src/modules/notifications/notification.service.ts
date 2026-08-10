import { NotificationType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { buildNotificationEmail, sendEmail } from "../../utils/email";
import { env } from "../../config/env";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  /** Optional override for the email subject (defaults to title). */
  emailSubject?: string;
  /** Optional CTA label in the HTML email. */
  linkLabel?: string;
  /**
   * Also email JOB_NOTIFY_CC (and any extras) with the same content.
   * Used for job lifecycle updates so ops always gets a copy.
   */
  copyToWatchers?: boolean;
}

async function sendWatcherCopies(params: {
  subject: string;
  body: string;
  link?: string;
  linkLabel?: string;
  skipEmails?: Array<string | null | undefined>;
}) {
  const watchers = [env.JOB_NOTIFY_CC].filter((email): email is string => Boolean(email));
  if (watchers.length === 0) return;

  const skip = new Set(
    (params.skipEmails ?? []).filter(Boolean).map((e) => e!.trim().toLowerCase()),
  );
  const linkUrl = params.link ? `${env.CORS_ORIGIN}${params.link}` : undefined;
  const { text, html } = buildNotificationEmail({
    title: params.subject,
    body: params.body,
    linkUrl,
    linkLabel: params.linkLabel,
  });

  await Promise.all(
    watchers
      .filter((email) => !skip.has(email.toLowerCase()))
      .map((email) =>
        sendEmail({
          to: email,
          subject: params.subject,
          text,
          html,
        }),
      ),
  );
}

/**
 * Fire in-app notification and mirror to email unless the user has turned
 * email off (Topbar → account menu → Email Notifications).
 *
 * Email is awaited so the send finishes before the HTTP response returns
 * (important on short-lived / serverless runtimes). SMTP failures are logged
 * inside sendEmail and do not fail the caller.
 */
export const notificationService = {
  async notify(params: NotifyParams) {
    const [notification, user] = await Promise.all([
      prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          body: params.body,
          link: params.link,
        },
      }),
      prisma.user.findUnique({
        where: { id: params.userId },
        select: { email: true, emailNotifications: true },
      }),
    ]);

    const subject = params.emailSubject ?? params.title;
    const linkUrl = params.link ? `${env.CORS_ORIGIN}${params.link}` : undefined;
    const { text, html } = buildNotificationEmail({
      title: subject,
      body: params.body,
      linkUrl,
      linkLabel: params.linkLabel,
    });

    if (user?.emailNotifications && user.email) {
      await sendEmail({
        to: user.email,
        subject,
        text,
        html,
      });
    }

    if (params.copyToWatchers) {
      await sendWatcherCopies({
        subject,
        body: params.body,
        link: params.link,
        linkLabel: params.linkLabel,
        skipEmails: [user?.email],
      });
    }

    return notification;
  },

  /** Email-only copy to JOB_NOTIFY_CC (no in-app row) — for job events with no primary user. */
  async copyWatchers(params: {
    title: string;
    body: string;
    link?: string;
    emailSubject?: string;
    linkLabel?: string;
  }) {
    await sendWatcherCopies({
      subject: params.emailSubject ?? params.title,
      body: params.body,
      link: params.link,
      linkLabel: params.linkLabel,
    });
  },

  list(userId: string, unreadOnly = false) {
    return prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  markRead(userId: string, id: string) {
    return prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  },

  markAllRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  },

  countUnread(userId: string) {
    return prisma.notification.count({ where: { userId, readAt: null } });
  },
};
