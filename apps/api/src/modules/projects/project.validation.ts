import { z } from "zod";

export const projectStatusEnum = z.enum([
  "CREATED",
  "ENGINEER_ASSIGNED",
  "INSTALLATION_IN_PROGRESS",
  "INSTALLATION_COMPLETE",
  "CONFIGURATION_COMPLETE",
  "TESTING_COMPLETE",
  "TRAINING_COMPLETE",
  "GO_LIVE",
  "CLOSED",
  "ON_HOLD",
]);

export const milestoneKeyEnum = z.enum([
  "ENGINEER_ASSIGNMENT",
  "INSTALLATION",
  "CONFIGURATION",
  "TESTING",
  "TRAINING",
  "GO_LIVE",
]);

export const milestoneStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "COMPLETE", "BLOCKED"]);

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  customerId: z.string().min(1, "customerId is required"),
  siteId: z.string().optional(),
  opportunityId: z.string().optional(),
  // The schema models a Project as originating from an allocated SalesOrder
  // (1:1, unique) — a project cannot exist without one.
  salesOrderId: z.string().min(1, "salesOrderId is required"),
  managerId: z.string().optional(),
  plannedGoLiveDate: z.coerce.date().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  siteId: z.string().optional(),
  opportunityId: z.string().optional(),
  managerId: z.string().optional(),
  status: projectStatusEnum.optional(),
  plannedGoLiveDate: z.coerce.date().optional(),
  actualGoLiveDate: z.coerce.date().optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const updateMilestoneSchema = z.object({
  status: milestoneStatusEnum.optional(),
  ownerId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  evidence: z.any().optional(),
});
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

export const listProjectsQuerySchema = z.object({
  status: projectStatusEnum.optional(),
  customerId: z.string().optional(),
  managerId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
