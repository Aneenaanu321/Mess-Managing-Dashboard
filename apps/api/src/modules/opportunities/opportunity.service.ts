import { OpportunityStage } from "@prisma/client";
import { opportunityRepository } from "./opportunity.repository";
import { CreateOpportunityInput, UpdateOpportunityInput, ChangeStageInput } from "./opportunity.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";
import { prisma } from "../../config/prisma";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

// Linear progression used only to flag when a stage change moves an opportunity
// backward through the pipeline (OpportunityStageHistory.isRegression). WON/LOST
// are terminal outcomes rather than pipeline steps, so they're excluded from the
// ordering and never counted as a regression target.
const STAGE_ORDER: OpportunityStage[] = [
  "REQUIREMENT_GATHERING",
  "SITE_SURVEY",
  "TECHNICAL_DISCUSSION",
  "INTERNAL_REVIEW",
  "QUOTATION_SENT",
  "NEGOTIATION",
];

function isRegression(from: OpportunityStage, to: OpportunityStage): boolean {
  const fromIdx = STAGE_ORDER.indexOf(from);
  const toIdx = STAGE_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx < fromIdx;
}

export const opportunityService = {
  async list(ctx: ActorCtx, query: { stage?: any; search?: string; customerId?: string; page: number; pageSize: number }) {
    return opportunityRepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const opportunity = await opportunityRepository.findById(ctx.companyId, id);
    if (!opportunity) throw ApiError.notFound("Opportunity not found");
    return opportunity;
  },

  async create(ctx: ActorCtx, input: CreateOpportunityInput) {
    const customer = await prisma.customer.findFirst({ where: { id: input.customerId, companyId: ctx.companyId } });
    if (!customer) throw ApiError.badRequest("Unknown customerId for this company");

    // Key matches the "OPPORTUNITY"/"OPP" sequence used by lead.service#convert so
    // both entry points into the pipeline share a single counter.
    const code = await nextNumber(ctx.companyId, "OPPORTUNITY", "OPP");

    const opportunity = await opportunityRepository.create({
      companyId: ctx.companyId,
      branchId: ctx.branchId,
      code,
      title: input.title,
      customer: { connect: { id: input.customerId } },
      estimatedValue: input.estimatedValue,
      currency: input.currency || "AED",
      expectedCloseDate: input.expectedCloseDate,
      ...(input.ownerId ? { owner: { connect: { id: input.ownerId } } } : { owner: { connect: { id: ctx.userId } } }),
    });

    await opportunityRepository.addStageHistory({
      opportunity: { connect: { id: opportunity.id } },
      toStage: "REQUIREMENT_GATHERING",
      changedById: ctx.userId,
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Opportunity",
      entityId: opportunity.id,
      action: "CREATE",
      after: opportunity,
    });

    return opportunity;
  },

  async update(ctx: ActorCtx, id: string, input: UpdateOpportunityInput) {
    const existing = await opportunityRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Opportunity not found");

    const { ownerId, ...rest } = input;
    const updated = await opportunityRepository.update(id, {
      ...rest,
      ...(ownerId !== undefined
        ? ownerId
          ? { owner: { connect: { id: ownerId } } }
          : { owner: { disconnect: true } }
        : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Opportunity",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    return updated;
  },

  async changeStage(ctx: ActorCtx, id: string, input: ChangeStageInput) {
    const existing = await opportunityRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Opportunity not found");
    if (existing.stage === "WON" || existing.stage === "LOST") {
      throw ApiError.conflict(`Opportunity is already ${existing.stage} and cannot change stage further`);
    }

    // Document checklist: advancing past Site Survey requires a site survey record.
    const fromIdx = STAGE_ORDER.indexOf(existing.stage);
    const toIdx = STAGE_ORDER.indexOf(input.stage);
    if (toIdx > STAGE_ORDER.indexOf("SITE_SURVEY") && fromIdx <= STAGE_ORDER.indexOf("SITE_SURVEY") && input.stage !== "WON" && input.stage !== "LOST") {
      const surveys = await prisma.siteSurvey.count({ where: { opportunityId: id } });
      if (surveys === 0) {
        throw ApiError.badRequest(
          "Add a Site Survey under Pre-sales before advancing past Site Survey.",
        );
      }
    }

    const regression = isRegression(existing.stage, input.stage);
    const now = new Date();

    const updated = await opportunityRepository.update(id, {
      stage: input.stage,
      ...(input.stage === "WON" ? { probability: 100, wonAt: now } : {}),
      ...(input.stage === "LOST"
        ? { probability: 0, lostAt: now, lossReason: input.lossReason, lossNote: input.lossNote }
        : {}),
      ...(input.competitor ? { competitor: input.competitor } : {}),
    });

    await opportunityRepository.addStageHistory({
      opportunity: { connect: { id } },
      fromStage: existing.stage,
      toStage: input.stage,
      changedById: ctx.userId,
      isRegression: regression,
    });

    // Auto follow-up: schedule a calendar reminder 2 business days out for the owner.
    if (!["WON", "LOST"].includes(input.stage) && !regression) {
      const followUpAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      await prisma.calendarEvent.create({
        data: {
          companyId: ctx.companyId,
          type: "FOLLOW_UP",
          title: `Follow up: ${existing.title} (${input.stage.replaceAll("_", " ")})`,
          startAt: followUpAt,
          ownerId: existing.ownerId ?? ctx.userId,
          opportunityId: id,
          reminderAt: followUpAt,
        },
      });
    }

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Opportunity",
      entityId: id,
      action: "STAGE_CHANGE",
      before: { stage: existing.stage },
      after: { stage: input.stage, lossReason: input.lossReason, lossNote: input.lossNote },
    });

    return updated;
  },
};
