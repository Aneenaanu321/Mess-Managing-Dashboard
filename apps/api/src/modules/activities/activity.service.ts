import { ActivityType } from "@prisma/client";
import { activityRepository } from "./activity.repository";
import { CreateActivityInput, ListActivitiesQuery } from "./activity.validation";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const activityService = {
  list(ctx: ActorCtx, query: ListActivitiesQuery) {
    return activityRepository.list(ctx.companyId, {
      leadId: query.leadId,
      customerId: query.customerId,
      opportunityId: query.opportunityId,
    });
  },

  create(ctx: ActorCtx, input: CreateActivityInput) {
    return activityRepository.create({
      companyId: ctx.companyId,
      type: input.type as ActivityType,
      subject: input.subject,
      body: input.body,
      occurredAt: input.occurredAt ?? new Date(),
      actor: { connect: { id: ctx.userId } },
      ...(input.leadId ? { lead: { connect: { id: input.leadId } } } : {}),
      ...(input.customerId ? { customer: { connect: { id: input.customerId } } } : {}),
      ...(input.opportunityId ? { opportunity: { connect: { id: input.opportunityId } } } : {}),
    });
  },
};
