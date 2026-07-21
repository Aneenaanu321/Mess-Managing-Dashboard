import { z } from "zod";

export const taskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]);

export const createTaskSchema = z.object({
  title: z.string().min(1, "title is required"),
  projectId: z.string().min(1, "projectId is required"),
  assigneeId: z.string().optional(),
  description: z.string().optional(),
  dueAt: z.coerce.date().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  status: taskStatusEnum.optional(),
  assigneeId: z.string().optional(),
  description: z.string().optional(),
  dueAt: z.coerce.date().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const listTasksQuerySchema = z.object({
  status: taskStatusEnum.optional(),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
