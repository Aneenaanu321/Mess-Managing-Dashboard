import { z } from "zod";

export const listApprovalsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});
export type ListApprovalsQuery = z.infer<typeof listApprovalsQuerySchema>;

export const decideApprovalSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().optional(),
});
export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;
