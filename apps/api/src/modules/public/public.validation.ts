import { z } from "zod";
import { leadSourceEnum, industryEnum } from "../leads/lead.validation";

// This is the one unauthenticated route in the whole API — bounds here
// matter more than elsewhere. The global express.json() 2mb body limit
// (see app.ts) is the backstop; these are the actual data-quality bounds.
export const intakeLeadSchema = z
  .object({
    webhookToken: z.string().min(1, "webhookToken is required").max(200),
    companyName: z.string().min(1, "Company name is required").max(200),
    contactName: z.string().min(1, "Contact name is required").max(200),
    email: z.string().email().max(200).optional().or(z.literal("")),
    phone: z.string().min(1).max(30).optional(),
    source: leadSourceEnum.default("WEBSITE"),
    industry: industryEnum.default("OTHER"),
    notes: z.string().max(5000).optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "At least one of email or phone is required",
    path: ["email"],
  });
export type IntakeLeadInput = z.infer<typeof intakeLeadSchema>;
