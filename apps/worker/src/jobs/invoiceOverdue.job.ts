import { prisma } from "../config/prisma";
import { notify } from "../notify";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Flips invoices past their due date (still unpaid or partially paid) to
 * OVERDUE and notifies the owning sales rep. Runs daily.
 */
export async function runInvoiceOverdueCheck() {
  const now = new Date();
  const overdue = await prisma.invoice.findMany({
    where: {
      status: { in: ["SENT", "PARTIALLY_PAID"] },
      dueDate: { lt: now },
    },
    include: { customer: { select: { id: true, name: true, ownerId: true } } },
  });

  let notified = 0;

  for (const invoice of overdue) {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "OVERDUE" } });

    if (!invoice.customer.ownerId) continue;

    const alreadySentToday = await prisma.notification.findFirst({
      where: {
        userId: invoice.customer.ownerId,
        type: "INVOICE_OVERDUE",
        link: `/finance/${invoice.id}`,
        createdAt: { gte: startOfToday() },
      },
    });
    if (alreadySentToday) continue;

    const balance = Number(invoice.totalAmount) - Number(invoice.amountPaid);
    await notify({
      userId: invoice.customer.ownerId,
      type: "INVOICE_OVERDUE",
      title: `Invoice ${invoice.code} is overdue`,
      body: `${invoice.customer.name} owes ${balance.toFixed(2)} ${invoice.currency} on ${invoice.code}, due ${invoice.dueDate.toDateString()}.`,
      link: `/finance/${invoice.id}`,
    });
    notified++;
  }

  return { checked: overdue.length, notified };
}
