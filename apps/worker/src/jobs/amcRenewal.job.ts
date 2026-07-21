import { prisma } from "../config/prisma";
import { notify } from "../notify";

const REMINDER_THRESHOLDS_DAYS = [90, 60, 30, 7];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * PRD success metric: "Zero missed AMC renewals (system-driven alerts
 * 90/60/30/7 days before expiry)". Runs daily. Idempotent: guards against
 * double-sends on manual re-runs by checking whether an AMC_RENEWAL
 * notification for this contract already went out today.
 */
export async function runAmcRenewalCheck() {
  const now = new Date();
  const contracts = await prisma.amcContract.findMany({
    where: { status: { in: ["ACTIVE", "EXPIRING_SOON"] } },
    include: { customer: { select: { id: true, name: true, ownerId: true } } },
  });

  let notified = 0;
  let statusChanges = 0;

  for (const contract of contracts) {
    const daysLeft = Math.ceil((contract.endDate.getTime() - now.getTime()) / MS_PER_DAY);

    if (daysLeft < 0) {
      await prisma.amcContract.update({ where: { id: contract.id }, data: { status: "LAPSED" } });
      statusChanges++;
      continue;
    }

    if (daysLeft <= 90 && contract.status === "ACTIVE") {
      await prisma.amcContract.update({ where: { id: contract.id }, data: { status: "EXPIRING_SOON" } });
      statusChanges++;
    }

    if (!contract.customer.ownerId) continue;
    if (!REMINDER_THRESHOLDS_DAYS.includes(daysLeft)) continue;

    const alreadySentToday = await prisma.notification.findFirst({
      where: {
        userId: contract.customer.ownerId,
        type: "AMC_RENEWAL",
        link: `/amc/${contract.id}`,
        createdAt: { gte: startOfToday() },
      },
    });
    if (alreadySentToday) continue;

    await notify({
      userId: contract.customer.ownerId,
      type: "AMC_RENEWAL",
      title: `AMC renewal due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      body: `${contract.code} for ${contract.customer.name} expires on ${contract.endDate.toDateString()}.`,
      link: `/amc/${contract.id}`,
    });
    notified++;
  }

  return { checked: contracts.length, notified, statusChanges };
}
