import { Request, Response } from "express";
import { publicService } from "./public.service";
import { intakeLeadSchema } from "./public.validation";

export const publicController = {
  async intakeLead(req: Request, res: Response) {
    const input = intakeLeadSchema.parse(req.body);
    const lead = await publicService.intakeLead(input);
    res.status(201).json({ success: true, data: lead });
  },

  async intakeEmailLead(req: Request, res: Response) {
    const input = intakeLeadSchema.parse({ ...req.body, source: "EMAIL" });
    const lead = await publicService.intakeLead(input);
    res.status(201).json({ success: true, data: lead });
  },

  async intakeWhatsAppLead(req: Request, res: Response) {
    const input = intakeLeadSchema.parse({ ...req.body, source: "WHATSAPP" });
    const lead = await publicService.intakeLead(input);
    res.status(201).json({ success: true, data: lead });
  },
};
