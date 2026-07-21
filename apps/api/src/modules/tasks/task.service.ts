import { taskRepository } from "./task.repository";
import { CreateTaskInput, UpdateTaskInput, ListTasksQuery } from "./task.validation";
import { ApiError } from "../../utils/ApiError";
import { writeAuditLog } from "../../utils/audit";
import { notificationService } from "../notifications/notification.service";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

export const taskService = {
  async list(ctx: ActorCtx, query: ListTasksQuery) {
    return taskRepository.list({ companyId: ctx.companyId, ...query });
  },

  async getById(ctx: ActorCtx, id: string) {
    const task = await taskRepository.findById(ctx.companyId, id);
    if (!task) throw ApiError.notFound("Task not found");
    return task;
  },

  async create(ctx: ActorCtx, input: CreateTaskInput) {
    const task = await taskRepository.create({
      companyId: ctx.companyId,
      project: { connect: { id: input.projectId } },
      title: input.title,
      ...(input.description ? { description: input.description } : {}),
      ...(input.dueAt ? { dueDate: input.dueAt } : {}),
      ...(input.assigneeId ? { assignee: { connect: { id: input.assigneeId } } } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "EngineerTask",
      entityId: task.id,
      action: "CREATE",
      after: task,
    });

    if (input.assigneeId) {
      await notificationService.notify({
        userId: input.assigneeId,
        type: "ASSIGNMENT",
        title: "New task assigned",
        body: `You've been assigned: ${task.title}`,
        link: `/tasks/${task.id}`,
      });
    }

    return task;
  },

  async update(ctx: ActorCtx, id: string, input: UpdateTaskInput) {
    const existing = await taskRepository.findByIdBare(ctx.companyId, id);
    if (!existing) throw ApiError.notFound("Task not found");

    const justCompleted = input.status === "DONE" && existing.status !== "DONE";

    const updated = await taskRepository.update(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.dueAt !== undefined ? { dueDate: input.dueAt } : {}),
      ...(input.assigneeId !== undefined ? { assignee: { connect: { id: input.assigneeId } } } : {}),
      ...(justCompleted ? { completedAt: new Date() } : {}),
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      entityType: "EngineerTask",
      entityId: id,
      action: "UPDATE",
      before: existing,
      after: updated,
    });

    return updated;
  },
};
