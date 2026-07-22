import { NotificationType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { sendEmail } from "../../utils/email";
import { env } from "../../config/env";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/**
 * Fire-and-forget in-app notification, mirrored to email (US-9.2) unless the
 * user has turned email off (Topbar → account menu → Email Notifications).
 * Kept synchronous/direct (not queued) for v1 simplicity; once apps/worker is
 * wired up, high-volume triggers (SLA scans, AMC renewal sweeps) should
 * enqueue via BullMQ instead of calling this in a request path loop.
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
      prisma.user.findUnique({ where: { id: params.userId }, select: { email: true, emailNotifications: true } }),
    ]);

    if (user?.emailNotifications) {
      // Not awaited on the critical path — a slow/unreachable mail server
      // shouldn't hold up whatever action triggered this notification.
      const link = params.link ? `${env.CORS_ORIGIN}${params.link}` : undefined;
      sendEmail({ to: user.email, subject: params.title, text: link ? `${params.body}\n\n${link}` : params.body }).catch(() => {});
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
