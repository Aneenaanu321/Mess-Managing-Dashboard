import { presalesRepository } from "./presales.repository";
import { CreateSiteSurveyInput, CreateDemoInput, CreatePocInput, CreateSolutionDesignInput } from "./presales.validation";
import { ApiError } from "../../utils/ApiError";
import { writeAuditLog } from "../../utils/audit";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

async function requireOpportunity(ctx: ActorCtx, opportunityId: string) {
  const ok = await presalesRepository.assertOpportunityInCompany(ctx.companyId, opportunityId);
  if (!ok) throw ApiError.badRequest("Unknown opportunityId for this company");
}

export const presalesService = {
  async listSiteSurveys(ctx: ActorCtx, opportunityId: string) {
    await requireOpportunity(ctx, opportunityId);
    return presalesRepository.listSiteSurveys(opportunityId);
  },

  async createSiteSurvey(ctx: ActorCtx, input: CreateSiteSurveyInput) {
    await requireOpportunity(ctx, input.opportunityId);
    const record = await presalesRepository.createSiteSurvey({
      opportunity: { connect: { id: input.opportunityId } },
      ...(input.siteId ? { site: { connect: { id: input.siteId } } } : {}),
      surveyDate: input.surveyDate,
      findings: input.findings,
      conductedById: ctx.userId,
    });
    await writeAuditLog({ companyId: ctx.companyId, actorId: ctx.userId, entityType: "SiteSurvey", entityId: record.id, action: "CREATE", after: record });
    return record;
  },

  async listDemos(ctx: ActorCtx, opportunityId: string) {
    await requireOpportunity(ctx, opportunityId);
    return presalesRepository.listDemos(opportunityId);
  },

  async createDemo(ctx: ActorCtx, input: CreateDemoInput) {
    await requireOpportunity(ctx, input.opportunityId);
    const record = await presalesRepository.createDemo({
      opportunity: { connect: { id: input.opportunityId } },
      demoDate: input.demoDate,
      productsShown: input.productsShown,
      outcome: input.outcome,
      conductedById: ctx.userId,
    });
    await writeAuditLog({ companyId: ctx.companyId, actorId: ctx.userId, entityType: "DemoRecord", entityId: record.id, action: "CREATE", after: record });
    return record;
  },

  async listPocs(ctx: ActorCtx, opportunityId: string) {
    await requireOpportunity(ctx, opportunityId);
    return presalesRepository.listPocs(opportunityId);
  },

  async createPoc(ctx: ActorCtx, input: CreatePocInput) {
    await requireOpportunity(ctx, input.opportunityId);
    const record = await presalesRepository.createPoc({
      opportunity: { connect: { id: input.opportunityId } },
      startDate: input.startDate,
      endDate: input.endDate,
      scope: input.scope,
      successCriteria: input.successCriteria,
      outcome: input.outcome,
    });
    await writeAuditLog({ companyId: ctx.companyId, actorId: ctx.userId, entityType: "PocRecord", entityId: record.id, action: "CREATE", after: record });
    return record;
  },

  async listSolutionDesigns(ctx: ActorCtx, opportunityId: string) {
    await requireOpportunity(ctx, opportunityId);
    return presalesRepository.listSolutionDesigns(opportunityId);
  },

  async createSolutionDesign(ctx: ActorCtx, input: CreateSolutionDesignInput) {
    await requireOpportunity(ctx, input.opportunityId);
    const record = await presalesRepository.createSolutionDesign({
      opportunity: { connect: { id: input.opportunityId } },
      title: input.title,
      description: input.description,
      createdById: ctx.userId,
    });
    await writeAuditLog({ companyId: ctx.companyId, actorId: ctx.userId, entityType: "SolutionDesign", entityId: record.id, action: "CREATE", after: record });
    return record;
  },
};
