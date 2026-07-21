import { NotificationType } from "@prisma/client";
import { prisma } from "./config/prisma";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

// Mirrors apps/api's notification.service.notify — kept as a separate copy
// (not a cross-package import) so this app can build/deploy independently.
export function notify(params: NotifyParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    },
  });
}
