import { MilestoneKey, MilestoneStatus } from "@prisma/client";
import { projectRepository } from "./project.repository";
import { CreateProjectInput, UpdateProjectInput, UpdateMilestoneInput, ListProjectsQuery } from "./project.validation";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

// Every new project ships with the full milestone checklist pre-seeded as
// PENDING so PMs/engineers see the whole delivery journey up front instead
// of adding milestones ad hoc.
const DEFAULT_MILESTONE_KEYS: MilestoneKey[] = [
  "ENGINEER_ASSIGNMENT",
  "INSTALLATION",
  "CONFIGURATION",
  "TESTING",
  "TRAINING",
  "GO_LIVE",
];

export const projectService = {
  async list(ctx: ActorCtx, query: ListProjectsQuery) {
    return projectRepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const project = await projectRepository.findById(ctx.companyId, id);
    if (!project) throw ApiError.notFound("Project not found");
    return project;
  },

  async create(ctx: ActorCtx, input: CreateProjectInput) {
    const code = await nextNumber(ctx.companyId, "PROJECT", "PRJ");

    const project = await projectRepository.create({
      companyId: ctx.companyId,
      branchId: ctx.branchId,
      code,
      name: input.name,
      customer: { connect: { id: input.customerId } },
      ...(input.siteId ? { site: { connect: { id: input.siteId } } } : {}),
      ...(input.opportunityId ? { opportunity: { connect: { id: input.opportunityId } } } : {}),
      salesOrder: { connect: { id: input.salesOrderId } },
      ...(input.managerId ? { manager: { connect: { id: input.managerId } } } : {}),
      ...(input.plannedGoLiveDate ? { plannedGoLiveDate: input.plannedGoLiveDate } : {}),
    });

    await projectRepository.seedMilestones(project.id, DEFAULT_MILESTONE_KEYS);

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Project",
      entityId: project.id,
      action: "CREATE",
      after: project,
    });

    return projectRepository.findById(ctx.companyId, project.id);
  },

  async update(ctx: ActorCtx, id: string, input: UpdateProjectInput) {
    const existing = await projectRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Project not found");

    const updated = await projectRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.siteId !== undefined ? { site: { connect: { id: input.siteId } } } : {}),
      ...(input.opportunityId !== undefined ? { opportunity: { connect: { id: input.opportunityId } } } : {}),
      ...(input.managerId !== undefined ? { manager: { connect: { id: input.managerId } } } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.plannedGoLiveDate !== undefined ? { plannedGoLiveDate: input.plannedGoLiveDate } : {}),
      ...(input.actualGoLiveDate !== undefined ? { actualGoLiveDate: input.actualGoLiveDate } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "Project",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    return updated;
  },

  async updateMilestone(ctx: ActorCtx, projectId: string, milestoneId: string, input: UpdateMilestoneInput) {
    const project = await projectRepository.findByIdBare(ctx.companyId, projectId);
    if (!project) throw ApiError.notFound("Project not found");

    const milestone = await projectRepository.findMilestone(projectId, milestoneId);
    if (!milestone) throw ApiError.notFound("Milestone not found");

    const completingNow = input.status === "COMPLETE" && milestone.status !== "COMPLETE";

    const updated = await projectRepository.updateMilestone(milestoneId, {
      ...(input.status !== undefined ? { status: input.status as MilestoneStatus } : {}),
      ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.evidence !== undefined ? { evidence: input.evidence } : {}),
      ...(completingNow ? { completedAt: new Date() } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "ProjectMilestone",
      entityId: milestoneId,
      action: "UPDATE",
      before: milestone,
      after: updated,
    });

    return updated;
  },
};
