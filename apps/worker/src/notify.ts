import { NotificationType } from "@prisma/client";
import { prisma } from "./config/prisma";
import { sendEmail } from "./email";
import { env } from "./config/env";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

// Mirrors apps/api's notification.service.notify — kept as a separate copy
// (not a cross-package import) so this app can build/deploy independently.
export async function notify(params: NotifyParams) {
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
    const link = params.link ? `${env.CORS_ORIGIN}${params.link}` : undefined;
    sendEmail({ to: user.email, subject: params.title, text: link ? `${params.body}\n\n${link}` : params.body }).catch(() => {});
  }

  return notification;
}
