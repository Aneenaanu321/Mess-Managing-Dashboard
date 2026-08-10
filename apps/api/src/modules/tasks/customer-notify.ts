import { prisma } from "../../config/prisma";
import { sendEmail, buildNotificationEmail } from "../../utils/email";
import { env } from "../../config/env";

type LinkedTask = {
  id: string;
  title: string;
  dueDate: Date | null;
  jobType: string;
  projectId: string | null;
  salesOrderId: string | null;
  customerPoId: string | null;
  invoiceId: string | null;
};

/** Resolve primary customer contact email via invoice → SO → PO → project. */
export async function resolveTaskCustomerContact(companyId: string, task: LinkedTask) {
  let customerId: string | null = null;

  if (task.invoiceId) {
    const inv = await prisma.invoice.findFirst({
      where: { id: task.invoiceId, companyId },
      select: { customerId: true },
    });
    customerId = inv?.customerId ?? null;
  }
  if (!customerId && task.salesOrderId) {
    const so = await prisma.salesOrder.findFirst({
      where: { id: task.salesOrderId, companyId },
      select: { customerId: true },
    });
    customerId = so?.customerId ?? null;
  }
  if (!customerId && task.customerPoId) {
    const po = await prisma.customerPO.findFirst({
      where: { id: task.customerPoId, companyId },
      select: { customerId: true },
    });
    customerId = po?.customerId ?? null;
  }
  if (!customerId && task.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: task.projectId, companyId },
      select: { customerId: true },
    });
    customerId = project?.customerId ?? null;
  }

  if (!customerId) return null;

  const contact =
    (await prisma.contact.findFirst({
      where: { customerId, email: { not: null }, isPrimary: true },
      select: { firstName: true, lastName: true, email: true, phone: true },
    })) ??
    (await prisma.contact.findFirst({
      where: { customerId, email: { not: null } },
      select: { firstName: true, lastName: true, email: true, phone: true },
      orderBy: { createdAt: "asc" },
    }));

  if (!contact?.email) return null;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
    select: { name: true },
  });

  return {
    customerId,
    customerName: customer?.name ?? "Customer",
    email: contact.email,
    phone: contact.phone,
    contactName: `${contact.firstName} ${contact.lastName}`.trim(),
  };
}

/** Outbound “customer before arrival” email (WhatsApp/SMS not configured yet). */
export async function sendCustomerBeforeArrivalNotice(companyId: string, task: LinkedTask) {
  const contact = await resolveTaskCustomerContact(companyId, task);
  if (!contact) {
    return { sent: false as const, reason: "no_customer_email" as const };
  }

  const due = task.dueDate
    ? task.dueDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })
    : "today / as scheduled";
  const body = `Hello ${contact.contactName},\n\nOur field team will arrive for "${task.title}" on ${due}.\n\nIf you need to reschedule or have access instructions, please reply to this email or contact your ibTech coordinator.\n\nThank you,\nibTech`;

  const { text, html } = buildNotificationEmail({
    title: "Visit notice — engineer on the way",
    body,
    linkUrl: env.CORS_ORIGIN ? `${env.CORS_ORIGIN.replace(/\/$/, "")}/portal` : undefined,
    linkLabel: "Open customer portal",
  });

  await sendEmail({
    to: contact.email,
    subject: `Visit notice: ${task.title}`,
    text,
    html,
  });

  return { sent: true as const, email: contact.email, customerName: contact.customerName };
}
