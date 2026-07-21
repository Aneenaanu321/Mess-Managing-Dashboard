import { z } from "zod";

export const opportunityScopeQuerySchema = z.object({
  opportunityId: z.string().min(1, "opportunityId is required"),
});

export const createSiteSurveySchema = z.object({
  opportunityId: z.string().min(1, "opportunityId is required"),
  siteId: z.string().optional(),
  surveyDate: z.coerce.date(),
  findings: z.string().optional(),
});
export type CreateSiteSurveyInput = z.infer<typeof createSiteSurveySchema>;

export const createDemoSchema = z.object({
  opportunityId: z.string().min(1, "opportunityId is required"),
  demoDate: z.coerce.date(),
  productsShown: z.string().optional(),
  outcome: z.string().optional(),
});
export type CreateDemoInput = z.infer<typeof createDemoSchema>;

export const createPocSchema = z.object({
  opportunityId: z.string().min(1, "opportunityId is required"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  scope: z.string().optional(),
  successCriteria: z.string().optional(),
  outcome: z.string().optional(),
});
export type CreatePocInput = z.infer<typeof createPocSchema>;

export const createSolutionDesignSchema = z.object({
  opportunityId: z.string().min(1, "opportunityId is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});
export type CreateSolutionDesignInput = z.infer<typeof createSolutionDesignSchema>;
