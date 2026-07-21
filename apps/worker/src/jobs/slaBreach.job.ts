import { TicketStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { notify } from "../notify";

const RISK_WINDOW_MS = 30 * 60 * 1000; // flag as at-risk within 30 min of the SLA deadline
const OPEN_STATUSES: TicketStatus[] = ["NEW", "ASSIGNED", "IN_PROGRESS", "REOPENED", "ESCALATED"];

/**
 * Scans open support tickets for SLA response/resolution deadlines that are
 * imminent (SLA_RISK) or already passed (SLA_BREACH). Runs frequently
 * (every few minutes) since ticket SLAs are measured in minutes, not days.
 * Idempotent per (ticket, kind) per day, same pattern as the AMC job.
 */
export async function runSlaBreachCheck() {
  const now = new Date();
  const riskCutoff = new Date(now.getTime() + RISK_WINDOW_MS);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: OPEN_STATUSES },
      OR: [
        { slaResponseDueAt: { lte: riskCutoff } },
        { slaResolutionDueAt: { lte: riskCutoff } },
      ],
    },
    include: { assignee: { select: { id: true } } },
  });

  let notified = 0;

  for (const ticket of tickets) {
    if (!ticket.assigneeId) continue;

    const checks: { dueAt: Date | null; label: "response" | "resolution" }[] = [
      { dueAt: ticket.slaResponseDueAt, label: "response" },
      { dueAt: ticket.slaResolutionDueAt, label: "resolution" },
    ];

    for (const check of checks) {
      if (!check.dueAt || check.dueAt > riskCutoff) continue;

      const isBreached = check.dueAt <= now;
      const type = isBreached ? "SLA_BREACH" : "SLA_RISK";
      const linkTag = `${ticket.id}:${check.label}:${type}`;

      const alreadySentToday = await prisma.notification.findFirst({
        where: {
          userId: ticket.assigneeId,
          type,
          link: `/support/${ticket.id}#${linkTag}`,
          createdAt: { gte: startOfToday },
        },
      });
      if (alreadySentToday) continue;

      await notify({
        userId: ticket.assigneeId,
        type,
        title: isBreached
          ? `SLA breached: ${check.label} on ${ticket.code}`
          : `SLA at risk: ${check.label} on ${ticket.code} due soon`,
        body: `${ticket.subject} — ${check.label} deadline ${isBreached ? "passed" : "approaching"} at ${check.dueAt.toLocaleString()}.`,
        link: `/support/${ticket.id}#${linkTag}`,
      });
      notified++;
    }
  }

  return { checked: tickets.length, notified };
}
