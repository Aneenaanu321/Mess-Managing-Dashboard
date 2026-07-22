import { DisqualifyReason } from "@prisma/client";
import { leadRepository } from "./lead.repository";
import {
  createLeadSchema,
  CreateLeadInput,
  UpdateLeadInput,
  BulkImportLeadsInput,
  BulkAssignLeadsInput,
} from "./lead.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { scoreLead } from "../ai/leadScoring";
import { writeAuditLog } from "../../utils/audit";
import { notificationService } from "../notifications/notification.service";
import { prisma } from "../../config/prisma";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

async function pickRoundRobinOwner(companyId: string): Promise<string | null> {
  const execs = await prisma.user.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      role: { key: { in: ["SALES_EXECUTIVE", "SALES_MANAGER"] } },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (execs.length === 0) return null;

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { roundRobinCursor: true } });
  const cursor = company?.roundRobinCursor ?? 0;
  const owner = execs[cursor % execs.length]!;
  await prisma.company.update({
    where: { id: companyId },
    data: { roundRobinCursor: cursor + 1 },
  });
  return owner.id;
}

export const leadService = {
  async list(
    ctx: ActorCtx,
    query: {
      status?: any;
      ownerId?: string;
      unassigned?: boolean;
      slaBreached?: boolean;
      industry?: any;
      search?: string;
      page: number;
      pageSize: number;
    },
  ) {
    const company = await prisma.company.findUnique({ where: { id: ctx.companyId }, select: { leadSlaHours: true } });
    return leadRepository.list({
      companyId: ctx.companyId,
      ...query,
      slaHours: company?.leadSlaHours ?? 24,
    });
  },

  async getById(ctx: ActorCtx, id: string) {
    const lead = await leadRepository.findById(ctx.companyId, id);
    if (!lead) throw ApiError.notFound("Lead not found");
    return lead;
  },

  async create(ctx: ActorCtx, input: CreateLeadInput) {
    const duplicate = await leadRepository.findDuplicate(ctx.companyId, input.email || undefined, input.phone);

    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { leadAssignMode: true },
    });

    let ownerId = input.ownerId;
    if (!ownerId && company?.leadAssignMode === "ROUND_ROBIN") {
      ownerId = (await pickRoundRobinOwner(ctx.companyId)) ?? undefined;
    }

    const code = await nextNumber(ctx.companyId, "LEAD", "LEAD");
    const score = scoreLead({
      source: input.source,
      industry: input.industry,
      email: input.email,
      phone: input.phone,
      contactName: input.contactName,
      companyName: input.companyName,
    });

    const lead = await leadRepository.create({
      company: { connect: { id: ctx.companyId } },
      branchId: ctx.branchId,
      code,
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email || null,
      phone: input.phone || null,
      source: input.source,
      industry: input.industry,
      notes: input.notes,
      score,
      scoreUpdatedAt: new Date(),
      ...(input.campaignId ? { campaign: { connect: { id: input.campaignId } } } : {}),
      ...(ownerId ? { owner: { connect: { id: ownerId } }, firstContactedAt: new Date() } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Lead",
      entityId: lead.id,
      action: "CREATE",
      after: lead,
    });

    if (ownerId) {
      await notificationService.notify({
        userId: ownerId,
        type: "ASSIGNMENT",
        title: "New lead assigned",
        body: `${lead.companyName} (${lead.code}) has been assigned to you.`,
        link: `/new-inquiries/${lead.id}`,
      });
    }

    return { ...lead, duplicateOf: duplicate ? { id: duplicate.id, code: duplicate.code } : null };
  },

  async update(ctx: ActorCtx, id: string, input: UpdateLeadInput) {
    const existing = await leadRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Lead not found");

    const updated = await leadRepository.update(id, {
      ...input,
      email: input.email === "" ? null : input.email,
    });

    // Re-score whenever source/industry/contact details change.
    const rescored = scoreLead({
      source: updated.source,
      industry: updated.industry,
      email: updated.email,
      phone: updated.phone,
      contactName: updated.contactName,
      companyName: updated.companyName,
    });
    if (rescored !== updated.score) {
      await leadRepository.updateScore(id, rescored);
    }

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Lead",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    return updated;
  },

  async assign(ctx: ActorCtx, id: string, ownerId: string) {
    const existing = await leadRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Lead not found");

    const updated = await leadRepository.assign(id, ownerId, existing.firstContactedAt ?? new Date());

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Lead",
      entityId: id,
      action: "ASSIGN",
      before: { ownerId: existing.ownerId },
      after: { ownerId },
    });

    await notificationService.notify({
      userId: ownerId,
      type: "ASSIGNMENT",
      title: "Lead assigned to you",
      body: `${updated.companyName} (${updated.code}) has been assigned to you.`,
      link: `/new-inquiries/${id}`,
    });

    return updated;
  },

  async bulkAssign(ctx: ActorCtx, input: BulkAssignLeadsInput) {
    const results: { id: string; ok: boolean; error?: string }[] = [];

    if (input.mode === "round_robin") {
      for (const leadId of input.leadIds) {
        try {
          const ownerId = await pickRoundRobinOwner(ctx.companyId);
          if (!ownerId) throw ApiError.badRequest("No sales executives available for round-robin");
          await this.assign(ctx, leadId, ownerId);
          results.push({ id: leadId, ok: true });
        } catch (err) {
          results.push({ id: leadId, ok: false, error: err instanceof Error ? err.message : "Failed" });
        }
      }
      return { results, assigned: results.filter((r) => r.ok).length };
    }

    if (!input.ownerId) throw ApiError.badRequest("ownerId is required for single-owner bulk assign");
    for (const leadId of input.leadIds) {
      try {
        await this.assign(ctx, leadId, input.ownerId);
        results.push({ id: leadId, ok: true });
      } catch (err) {
        results.push({ id: leadId, ok: false, error: err instanceof Error ? err.message : "Failed" });
      }
    }
    return { results, assigned: results.filter((r) => r.ok).length };
  },

  assignableOwners(ctx: ActorCtx) {
    return leadRepository.assignableUsers(ctx.companyId);
  },

  async disqualify(ctx: ActorCtx, id: string, reason: DisqualifyReason, note?: string) {
    const existing = await leadRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Lead not found");
    if (existing.status === "CONVERTED") {
      throw ApiError.conflict("A converted lead cannot be disqualified");
    }

    const updated = await leadRepository.disqualify(id, reason, note);

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Lead",
      entityId: id,
      action: "DISQUALIFY",
      before: { status: existing.status },
      after: { status: updated.status, disqualifyReason: reason, disqualifyNote: note },
    });

    return updated;
  },

  /**
   * US-1.3: qualifying a lead converts it into an Opportunity, preserving
   * lead source/history via the Lead.convertedOpportunityId back-link.
   * Idempotent: a lead can only be converted once (enforced by the unique
   * constraint on convertedOpportunityId + the CONVERTED status check here).
   */
  async convert(ctx: ActorCtx, id: string, opts: { title?: string; estimatedValue: number; currency?: string }) {
    const existing = await leadRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Lead not found");
    if (existing.status === "CONVERTED") {
      throw ApiError.conflict("Lead has already been converted", { opportunityId: existing.convertedOpportunityId });
    }
    if (existing.status === "DISQUALIFIED") {
      throw ApiError.conflict("A disqualified lead cannot be converted");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find-or-create the Customer this lead belongs to (matched by company name within tenant).
      let customer = await tx.customer.findFirst({ where: { companyId: ctx.companyId, name: existing.companyName } });
      if (!customer) {
        const customerCode = await nextNumber(ctx.companyId, "CUSTOMER", "CUST");
        customer = await tx.customer.create({
          data: {
            companyId: ctx.companyId,
            branchId: existing.branchId,
            code: customerCode,
            name: existing.companyName,
            industry: existing.industry,
            ownerId: existing.ownerId,
            contacts: existing.contactName
              ? { create: [{ firstName: existing.contactName, lastName: "", email: existing.email, phone: existing.phone, isPrimary: true }] }
              : undefined,
          },
        });
      }

      const oppCode = await nextNumber(ctx.companyId, "OPPORTUNITY", "OPP");
      const opportunity = await tx.opportunity.create({
        data: {
          companyId: ctx.companyId,
          branchId: existing.branchId,
          code: oppCode,
          title: opts.title || `${existing.companyName} — RFID Solution`,
          customerId: customer.id,
          ownerId: existing.ownerId,
          estimatedValue: opts.estimatedValue,
          currency: opts.currency || "AED",
        },
      });

      await tx.opportunityStageHistory.create({
        data: { opportunityId: opportunity.id, toStage: "REQUIREMENT_GATHERING" },
      });

      await tx.lead.update({
        where: { id },
        data: { status: "CONVERTED", convertedOpportunityId: opportunity.id },
      });

      return { customer, opportunity };
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Lead",
      entityId: id,
      action: "CONVERT",
      after: { opportunityId: result.opportunity.id, customerId: result.customer.id },
    });

    return result;
  },

  /**
   * CSV bulk import (PRD: "replace Excel-based tracking"). Reuses `create`
   * row-by-row rather than a single bulk insert so each row still gets
   * duplicate detection, AI scoring, and its own audit log entry —
   * consistency with a manually-created lead mattered more here than raw
   * throughput at the (capped at 500 rows) sizes this is meant for. One bad
   * row doesn't abort the batch; its error comes back per-row instead.
   */
  async bulkImport(ctx: ActorCtx, input: BulkImportLeadsInput) {
    const outcomes: Array<{ row: number; success: boolean; code?: string; error?: string }> = [];

    for (let i = 0; i < input.rows.length; i++) {
      const parsed = createLeadSchema.safeParse(input.rows[i]);
      if (!parsed.success) {
        const message = parsed.error.issues.map((issue) => issue.message).join("; ");
        outcomes.push({ row: i + 1, success: false, error: message });
        continue;
      }

      try {
        const lead = await this.create(ctx, parsed.data);
        outcomes.push({ row: i + 1, success: true, code: lead.code });
      } catch (err) {
        outcomes.push({ row: i + 1, success: false, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    return {
      total: input.rows.length,
      created: outcomes.filter((o) => o.success).length,
      failed: outcomes.filter((o) => !o.success),
    };
  },
};
