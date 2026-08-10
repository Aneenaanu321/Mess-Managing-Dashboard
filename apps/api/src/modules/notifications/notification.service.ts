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

    if (user?.emailNotifications && user.email) {
      const linkUrl = params.link ? `${env.CORS_ORIGIN}${params.link}` : undefined;
      const { text, html } = buildNotificationEmail({
        title: params.emailSubject ?? params.title,
        body: params.body,
        linkUrl,
        linkLabel: params.linkLabel,
      });
      await sendEmail({
        to: user.email,
        subject: params.emailSubject ?? params.title,
        text,
        html,
      });
    }

    return notification;
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
