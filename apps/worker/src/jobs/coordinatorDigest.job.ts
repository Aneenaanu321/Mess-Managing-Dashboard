import { prisma } from "../config/prisma";
import { notify } from "../notify";

/**
 * Morning digest: notify coordinators/managers of queue depth via in-app notification
 * (and email if their preference + SMTP is configured via notify()).
 */
export async function runCoordinatorDigest() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, leadSlaHours: true, quoteChaseDays: true },
  });
  let notified = 0;
  const now = new Date();

  for (const company of companies) {
    const slaCutoff = new Date(now.getTime() - (company.leadSlaHours ?? 24) * 60 * 60 * 1000);
    const chaseCutoff = new Date(now.getTime() - (company.quoteChaseDays ?? 7) * 24 * 60 * 60 * 1000);
    const approvalStuck = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const stale7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [unassigned, slaBreached, overdueEvents, quotesChase, pos, stuckApprovals, staleOpps] = await Promise.all([
      prisma.lead.count({
        where: { companyId: company.id, ownerId: null, status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } },
      }),
      prisma.lead.count({
        where: {
          companyId: company.id,
          status: { in: ["NEW", "CONTACTED"] },
          firstContactedAt: null,
          createdAt: { lt: slaCutoff },
        },
      }),
      prisma.calendarEvent.count({
        where: { companyId: company.id, completedAt: null, startAt: { lt: now } },
      }),
      prisma.quotation.count({
        where: { companyId: company.id, status: "SENT", sentAt: { lt: chaseCutoff }, decidedAt: null },
      }),
      prisma.customerPO.count({ where: { companyId: company.id, status: "RECEIVED" } }),
      prisma.approval.count({
        where: { companyId: company.id, status: "PENDING", requestedAt: { lt: approvalStuck } },
      }),
      prisma.opportunity.count({
        where: { companyId: company.id, stage: { notIn: ["WON", "LOST"] }, updatedAt: { lt: stale7 } },
      }),
    ]);

    const total = unassigned + slaBreached + overdueEvents + quotesChase + pos + stuckApprovals + staleOpps;
    if (total === 0) continue;

    const recipients = await prisma.user.findMany({
      where: {
        companyId: company.id,
        status: "ACTIVE",
        role: { key: { in: ["SALES_COORDINATOR", "SALES_MANAGER", "SALES_DIRECTOR"] } },
      },
      select: { id: true },
    });

    const body = [
      `${unassigned} unassigned leads`,
      `${slaBreached} SLA breaches`,
      `${overdueEvents} overdue follow-ups`,
      `${quotesChase} quotes to chase`,
      `${pos} POs awaiting verify`,
      `${stuckApprovals} stuck approvals`,
      `${staleOpps} stale deals`,
    ].join(" · ");

    for (const user of recipients) {
      await notify({
        userId: user.id,
        type: "SYSTEM",
        title: "Daily coordinator digest",
        body,
        link: "/coordinator",
      });
      notified += 1;
    }
  }

  return { companies: companies.length, notified };
}
