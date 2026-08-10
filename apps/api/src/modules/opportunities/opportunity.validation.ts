import { z } from "zod";

export const opportunityStageEnum = z.enum([
  "REQUIREMENT_GATHERING",
  "SITE_SURVEY",
  "TECHNICAL_DISCUSSION",
  "INTERNAL_REVIEW",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
]);

export const lossReasonEnum = z.enum(["PRICE", "COMPETITOR", "TIMING", "BUDGET", "NO_DECISION", "TECHNICAL_FIT", "OTHER"]);

export const createOpportunitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  customerId: z.string().min(1, "customerId is required"),
  estimatedValue: z.coerce.number().nonnegative("estimatedValue must be a non-negative number"),
  currency: z.string().optional(),
  expectedCloseDate: z.coerce.date().optional(),
  ownerId: z.string().optional(),
});
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

export const updateOpportunitySchema = z.object({
  title: z.string().min(1).optional(),
  estimatedValue: z.coerce.number().nonnegative().optional(),
  currency: z.string().optional(),
  expectedCloseDate: z.coerce.date().optional(),
  ownerId: z.string().optional(),
  competitor: z.string().optional(),
  internalNotes: z.string().optional(),
});
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;

export const changeStageSchema = z
  .object({
    stage: opportunityStageEnum,
    lossReason: lossReasonEnum.optional(),
    lossNote: z.string().optional(),
    competitor: z.string().optional(),
  })
  .refine((data) => data.stage !== "LOST" || !!data.lossReason, {
    message: "lossReason is required when moving an opportunity to LOST",
    path: ["lossReason"],
  });
export type ChangeStageInput = z.infer<typeof changeStageSchema>;

export const listOpportunitiesQuerySchema = z.object({
  stage: opportunityStageEnum.optional(),
  search: z.string().optional(),
  customerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});
