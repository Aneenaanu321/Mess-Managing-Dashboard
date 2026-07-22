import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { leadRepository } from "../leads/lead.repository";
import { UpdateLeadOpsSettingsInput } from "./salesOps.validation";
import { writeAuditLog } from "../../utils/audit";

interface Ctx {
  companyId: string;
  userId: string;
  branchId: string | null;
}

const STALE_DAYS = [7, 14, 30] as const;

export const salesOpsService = {
  async worklist(ctx: Ctx) {
    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { leadSlaHours: true, quoteChaseDays: true },
    });
    const slaHours = company?.leadSlaHours ?? 24;
    const chaseDays = company?.quoteChaseDays ?? 7;
    const now = new Date();
    const slaCutoff = new Date(now.getTime() - slaHours * 60 * 60 * 1000);
    const chaseCutoff = new Date(now.getTime() - chaseDays * 24 * 60 * 60 * 1000);
    const stale7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const stale14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const stale30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const approvalStuck = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [
      unassignedLeads,
      slaBreachedLeads,
      overdueFollowUps,
      quotesToChase,
      quotesPendingSend,
      posAwaitingVerify,
      stuckApprovals,
      staleOpps7,
      staleOpps14,
      staleOpps30,
    ] = await Promise.all([
      prisma.lead.findMany({
        where: { companyId: ctx.companyId, ownerId: null, status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } },
        include: { owner: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
      prisma.lead.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["NEW", "CONTACTED"] },
          firstContactedAt: null,
          createdAt: { lt: slaCutoff },
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
      prisma.calendarEvent.findMany({
        where: {
          companyId: ctx.companyId,
          completedAt: null,
          startAt: { lt: now },
        },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
          opportunity: { select: { id: true, code: true, title: true } },
        },
        orderBy: { startAt: "asc" },
        take: 50,
      }),
      prisma.quotation.findMany({
        where: {
          companyId: ctx.companyId,
          status: "SENT",
          sentAt: { lt: chaseCutoff },
          decidedAt: null,
        },
        include: {
          customer: { select: { id: true, name: true } },
          opportunity: { select: { id: true, code: true, title: true } },
        },
        orderBy: { sentAt: "asc" },
        take: 50,
      }),
      prisma.quotation.findMany({
        where: {
          companyId: ctx.companyId,
          status: { in: ["DRAFT", "APPROVED_INTERNAL"] },
        },
        include: { customer: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.customerPO.findMany({
        where: { companyId: ctx.companyId, status: "RECEIVED" },
        include: { customer: { select: { name: true } }, quotation: { select: { code: true } } },
        orderBy: { receivedAt: "asc" },
        take: 50,
      }),
      prisma.approval.findMany({
        where: {
          companyId: ctx.companyId,
          status: "PENDING",
          requestedAt: { lt: approvalStuck },
        },
        include: {
          requestedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { requestedAt: "asc" },
        take: 50,
      }),
      prisma.opportunity.count({
        where: { companyId: ctx.companyId, stage: { notIn: ["WON", "LOST"] }, updatedAt: { lt: stale7 } },
      }),
      prisma.opportunity.count({
        where: { companyId: ctx.companyId, stage: { notIn: ["WON", "LOST"] }, updatedAt: { lt: stale14 } },
      }),
      prisma.opportunity.count({
        where: { companyId: ctx.companyId, stage: { notIn: ["WON", "LOST"] }, updatedAt: { lt: stale30 } },
      }),
    ]);

    const staleOpportunities = await prisma.opportunity.findMany({
      where: { companyId: ctx.companyId, stage: { notIn: ["WON", "LOST"] }, updatedAt: { lt: stale7 } },
      include: {
        customer: { select: { name: true } },
        owner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "asc" },
      take: 50,
    });

    const openHandoffs = await prisma.opportunity.count({
      where: {
        companyId: ctx.companyId,
        stage: "WON",
        projects: { none: {} },
      },
    });

    return {
      counts: {
        unassignedLeads: unassignedLeads.length,
        slaBreachedLeads: slaBreachedLeads.length,
        overdueFollowUps: overdueFollowUps.length,
        quotesToChase: quotesToChase.length,
        quotesPendingSend: quotesPendingSend.length,
        posAwaitingVerify: posAwaitingVerify.length,
        stuckApprovals: stuckApprovals.length,
        staleOpportunities7: staleOpps7,
        staleOpportunities14: staleOpps14,
        staleOpportunities30: staleOpps30,
        openHandoffs,
      },
      unassignedLeads,
      slaBreachedLeads,
      overdueFollowUps,
      quotesToChase,
      quotesPendingSend,
      posAwaitingVerify,
      stuckApprovals,
      staleOpportunities,
      settings: { leadSlaHours: slaHours, quoteChaseDays: chaseDays },
    };
  },

  async handoffs(ctx: Ctx) {
    const won = await prisma.opportunity.findMany({
      where: { companyId: ctx.companyId, stage: "WON" },
      include: {
        customer: { select: { id: true, name: true } },
        owner: { select: { firstName: true, lastName: true } },
        customerPOs: {
          include: { salesOrder: { select: { id: true, code: true, status: true } } },
          orderBy: { receivedAt: "desc" },
        },
        projects: { select: { id: true, code: true, status: true }, take: 1 },
        quotations: {
          where: { status: { in: ["CUSTOMER_APPROVED", "SENT", "APPROVED_INTERNAL"] } },
          select: { id: true, code: true, status: true, grandTotal: true },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy: { wonAt: "desc" },
      take: 100,
    });

    return won.map((opp) => {
      const po = opp.customerPOs[0] ?? null;
      const project = opp.projects[0] ?? null;
      const verified = po?.status === "VERIFIED" || !!po?.salesOrder;
      const checklist = {
        hasQuotation: opp.quotations.length > 0,
        hasPo: !!po,
        poDocumentUploaded: !!(po?.documentUrl),
        amountMatches: po ? !po.amountMismatch : false,
        poVerified: verified,
        poStatus: po?.status ?? null,
        advanceReceived: !!po?.advanceReceivedAt,
        hasSalesOrder: !!po?.salesOrder,
        hasProject: !!project,
        readyForHandoff: false as boolean,
      };

      checklist.readyForHandoff =
        checklist.hasPo &&
        checklist.amountMatches &&
        verified &&
        (Number(po?.advanceRequired ?? 0) === 0 || checklist.advanceReceived) &&
        checklist.hasSalesOrder;

      const blockers: string[] = [];
      if (!checklist.hasPo) blockers.push("Customer PO missing");
      else {
        if (!checklist.poDocumentUploaded) blockers.push("PO document not uploaded");
        if (!checklist.amountMatches) blockers.push("PO amount mismatch vs quotation");
        if (!verified) blockers.push("PO not verified");
        if (Number(po?.advanceRequired ?? 0) > 0 && !checklist.advanceReceived) blockers.push("Advance payment not recorded");
        if (!checklist.hasSalesOrder) blockers.push("Sales order not created");
      }
      if (!checklist.hasProject && checklist.readyForHandoff) blockers.push("Project not created yet");

      return {
        id: opp.id,
        code: opp.code,
        title: opp.title,
        wonAt: opp.wonAt,
        customer: opp.customer,
        owner: opp.owner,
        po: po
          ? {
              id: po.id,
              code: po.code,
              status: po.status,
              amountMismatch: po.amountMismatch,
              advanceRequired: po.advanceRequired,
              advanceReceivedAt: po.advanceReceivedAt,
              documentUrl: po.documentUrl,
              salesOrder: po.salesOrder,
            }
          : null,
        project,
        checklist,
        blockers,
      };
    });
  },

  async hygiene(ctx: Ctx) {
    const [customers, leads] = await Promise.all([
      prisma.customer.findMany({
        where: { companyId: ctx.companyId },
        include: {
          contacts: { select: { id: true, isPrimary: true }, take: 5 },
          owner: { select: { firstName: true, lastName: true } },
        },
        take: 300,
      }),
      leadRepository.findDuplicateCandidates(ctx.companyId),
    ]);

    const missingContact = customers.filter((c) => c.contacts.length === 0 || !c.contacts.some((x) => x.isPrimary));
    const noOwner = customers.filter((c) => !c.ownerId);

    const byKey = new Map<string, typeof leads>();
    for (const lead of leads) {
      for (const key of [lead.email?.toLowerCase(), lead.phone].filter(Boolean) as string[]) {
        const list = byKey.get(key) ?? [];
        list.push(lead);
        byKey.set(key, list);
      }
    }
    const duplicateGroups = [...byKey.entries()]
      .map(([key, group]) => {
        const unique = [...new Map(group.map((l) => [l.id, l])).values()];
        return unique.length > 1 ? { key, leads: unique } : null;
      })
      .filter(Boolean);

    return {
      customersMissingPrimaryContact: missingContact.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        owner: c.owner,
      })),
      customersWithoutOwner: noOwner.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
      })),
      duplicateLeadGroups: duplicateGroups.slice(0, 50),
    };
  },

  async metrics(ctx: Ctx) {
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [assignedLeads, sentQuotes, verifiedPos] = await Promise.all([
      prisma.lead.findMany({
        where: { companyId: ctx.companyId, ownerId: { not: null }, createdAt: { gte: since30 } },
        select: { createdAt: true, firstContactedAt: true },
        take: 500,
      }),
      prisma.quotation.findMany({
        where: { companyId: ctx.companyId, sentAt: { gte: since30 } },
        select: { createdAt: true, sentAt: true },
        take: 500,
      }),
      prisma.customerPO.findMany({
        where: { companyId: ctx.companyId, status: "VERIFIED", receivedAt: { gte: since30 } },
        select: { receivedAt: true, createdAt: true },
        take: 500,
      }),
    ]);

    function avgHours(pairs: { start: Date; end: Date }[]) {
      if (pairs.length === 0) return null;
      const sum = pairs.reduce((acc, p) => acc + (p.end.getTime() - p.start.getTime()) / 36e5, 0);
      return Math.round((sum / pairs.length) * 10) / 10;
    }

    return {
      avgHoursToFirstContact: avgHours(
        assignedLeads
          .filter((l) => l.firstContactedAt)
          .map((l) => ({ start: l.createdAt, end: l.firstContactedAt! })),
      ),
      avgHoursQuoteToSend: avgHours(
        sentQuotes.filter((q) => q.sentAt).map((q) => ({ start: q.createdAt, end: q.sentAt! })),
      ),
      avgHoursPoToVerify: avgHours(verifiedPos.map((p) => ({ start: p.receivedAt, end: p.createdAt }))),
      sampleSizes: {
        leads: assignedLeads.length,
        quotes: sentQuotes.length,
        pos: verifiedPos.length,
      },
      staleDayBuckets: STALE_DAYS,
    };
  },

  async getLeadOpsSettings(ctx: Ctx) {
    return prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: {
        leadAssignMode: true,
        roundRobinCursor: true,
        leadSlaHours: true,
        quoteChaseDays: true,
      },
    });
  },

  async updateLeadOpsSettings(ctx: Ctx, input: UpdateLeadOpsSettingsInput) {
    const before = await this.getLeadOpsSettings(ctx);
    const updated = await prisma.company.update({
      where: { id: ctx.companyId },
      data: {
        ...(input.leadAssignMode ? { leadAssignMode: input.leadAssignMode } : {}),
        ...(input.leadSlaHours !== undefined ? { leadSlaHours: input.leadSlaHours } : {}),
        ...(input.quoteChaseDays !== undefined ? { quoteChaseDays: input.quoteChaseDays } : {}),
      },
      select: {
        leadAssignMode: true,
        roundRobinCursor: true,
        leadSlaHours: true,
        quoteChaseDays: true,
      },
    });
    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Company",
      entityId: ctx.companyId,
      action: "UPDATE",
      before,
      after: updated,
    });
    return updated;
  },

  async listHandovers(ctx: Ctx) {
    return prisma.shiftHandoverNote.findMany({
      where: { companyId: ctx.companyId },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  },

  async createHandover(ctx: Ctx, body: string) {
    return prisma.shiftHandoverNote.create({
      data: {
        companyId: ctx.companyId,
        authorId: ctx.userId,
        body,
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });
  },

  async dealSummary(ctx: Ctx, opportunityId: string) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: opportunityId, companyId: ctx.companyId },
      include: {
        customer: true,
        owner: { select: { firstName: true, lastName: true, email: true } },
        leadSource: true,
        quotations: { orderBy: { version: "desc" }, include: { lineItems: true } },
        customerPOs: true,
        activities: { orderBy: { occurredAt: "desc" }, take: 20 },
      },
    });
    if (!opportunity) throw ApiError.notFound("Opportunity not found");
    return opportunity;
  },

  async quotationRevisions(ctx: Ctx, quotationId: string) {
    const quote = await prisma.quotation.findFirst({
      where: { id: quotationId, companyId: ctx.companyId },
      include: {
        parentQuotation: true,
        revisions: { orderBy: { version: "asc" } },
      },
    });
    if (!quote) throw ApiError.notFound("Quotation not found");

    const rootId = quote.parentQuotationId ?? quote.id;
    const versions = await prisma.quotation.findMany({
      where: {
        companyId: ctx.companyId,
        OR: [{ id: rootId }, { parentQuotationId: rootId }],
      },
      orderBy: { version: "asc" },
      select: {
        id: true,
        code: true,
        version: true,
        status: true,
        grandTotal: true,
        currency: true,
        revisionNote: true,
        sentAt: true,
        createdAt: true,
      },
    });
    return { current: quote, versions };
  },

  async scheduleMeeting(
    ctx: Ctx,
    input: {
      opportunityId: string;
      type: "DEMO" | "SITE_VISIT" | "MEETING" | "FOLLOW_UP";
      title: string;
      startAt: string;
      endAt?: string;
      ownerId?: string;
      note?: string;
    },
  ) {
    const opp = await prisma.opportunity.findFirst({
      where: { id: input.opportunityId, companyId: ctx.companyId },
    });
    if (!opp) throw ApiError.notFound("Opportunity not found");

    const event = await prisma.calendarEvent.create({
      data: {
        companyId: ctx.companyId,
        type: input.type,
        title: input.title,
        startAt: new Date(input.startAt),
        endAt: input.endAt ? new Date(input.endAt) : null,
        ownerId: input.ownerId ?? ctx.userId,
        opportunityId: input.opportunityId,
        reminderAt: new Date(new Date(input.startAt).getTime() - 60 * 60 * 1000),
      },
    });

    if (input.note) {
      await prisma.activity.create({
        data: {
          companyId: ctx.companyId,
          type: "MEETING",
          subject: input.title,
          body: input.note,
          actorId: ctx.userId,
          opportunityId: input.opportunityId,
          occurredAt: new Date(input.startAt),
        },
      });
    }

    return event;
  },
};
