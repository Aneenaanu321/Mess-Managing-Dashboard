import { z } from "zod";
import { leadSourceEnum, industryEnum } from "../leads/lead.validation";

export const intakeLeadSchema = z
  .object({
    webhookToken: z.string().min(1, "webhookToken is required"),
    companyName: z.string().min(1, "Company name is required"),
    contactName: z.string().min(1, "Contact name is required"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(1).optional(),
    source: leadSourceEnum.default("WEBSITE"),
    industry: industryEnum.default("OTHER"),
    notes: z.string().optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "At least one of email or phone is required",
    path: ["email"],
  });
export type IntakeLeadInput = z.infer<typeof intakeLeadSchema>;
