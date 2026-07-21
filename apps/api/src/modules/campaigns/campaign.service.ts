import { campaignRepository } from "./campaign.repository";
import { CreateCampaignInput, UpdateCampaignInput, ListCampaignsQuery } from "./campaign.validation";
import { ApiError } from "../../utils/ApiError";
import { writeAuditLog } from "../../utils/audit";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const campaignService = {
  list(ctx: ActorCtx, query: ListCampaignsQuery) {
    return campaignRepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const campaign = await campaignRepository.findById(ctx.companyId, id);
    if (!campaign) throw ApiError.notFound("Campaign not found");
    return campaign;
  },

  async create(ctx: ActorCtx, input: CreateCampaignInput) {
    const campaign = await campaignRepository.create({
      company: { connect: { id: ctx.companyId } },
      name: input.name,
      channel: input.channel,
      startDate: input.startDate,
      endDate: input.endDate,
      budget: input.budget,
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Campaign",
      entityId: campaign.id,
      action: "CREATE",
      after: campaign,
    });

    return campaign;
  },

  async update(ctx: ActorCtx, id: string, input: UpdateCampaignInput) {
    const existing = await campaignRepository.findById(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Campaign not found");

    const updated = await campaignRepository.update(id, input);

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Campaign",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    return updated;
  },
};
