import { z } from "zod";

export const createPortalTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  deviceId: z.string().optional(),
});
export type CreatePortalTicketInput = z.infer<typeof createPortalTicketSchema>;

export const createPortalTicketCommentSchema = z.object({
  body: z.string().min(1, "Comment is required").max(5000),
});
export type CreatePortalTicketCommentInput = z.infer<typeof createPortalTicketCommentSchema>;

export const portalSignOffSchema = z.object({
  name: z.string().min(1, "Signer name is required"),
  document: z.enum(["DO", "INVOICE", "BOTH"]).default("BOTH"),
  signatureDataUrl: z.string().min(32).optional(),
});
export type PortalSignOffInput = z.infer<typeof portalSignOffSchema>;
