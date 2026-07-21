import { NotificationType } from "@prisma/client";
import { prisma } from "../../config/prisma";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/**
 * Fire-and-forget in-app notification. Kept synchronous/direct (not queued)
 * for v1 simplicity; once apps/worker is wired up, high-volume triggers
 * (SLA scans, AMC renewal sweeps) should enqueue via BullMQ instead of
 * calling this in a request path loop.
 */
export const notificationService = {
  async notify(params: NotifyParams) {
    return prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link,
      },
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
};
