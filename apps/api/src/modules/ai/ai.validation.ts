import { z } from "zod";

export const aiChatSchema = z.object({
  message: z.string().min(1, "message is required").max(2000, "message is too long"),
});
export type AiChatInput = z.infer<typeof aiChatSchema>;
