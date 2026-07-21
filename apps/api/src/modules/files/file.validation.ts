import { z } from "zod";

export const listFilesQuerySchema = z.object({
  entityType: z.string().min(1, "entityType is required"),
  entityId: z.string().min(1, "entityId is required"),
});
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;

export const uploadFileBodySchema = z.object({
  entityType: z.string().min(1, "entityType is required"),
  entityId: z.string().min(1, "entityId is required"),
});
export type UploadFileBody = z.infer<typeof uploadFileBodySchema>;
