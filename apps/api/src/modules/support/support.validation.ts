import { z } from "zod";

export const ticketPriorityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export const ticketStatusEnum = z.enum(["NEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REOPENED", "ESCALATED"]);

export const createTicketSchema = z.object({
  subject: z.string().min(1, "subject is required"),
  description: z.string().optional(),
  priority: ticketPriorityEnum.default("MEDIUM"),
  customerId: z.string().min(1, "customerId is required"),
  deviceId: z.string().optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z.object({
  status: ticketStatusEnum.optional(),
  priority: ticketPriorityEnum.optional(),
  assigneeId: z.string().optional(),
  resolutionNote: z.string().optional(),
});
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const createTicketCommentSchema = z.object({
  body: z.string().min(1, "body is required"),
  isInternal: z.boolean().default(false),
});
export type CreateTicketCommentInput = z.infer<typeof createTicketCommentSchema>;

export const listTicketsQuerySchema = z.object({
  status: ticketStatusEnum.optional(),
  priority: ticketPriorityEnum.optional(),
  customerId: z.string().optional(),
  assigneeId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
