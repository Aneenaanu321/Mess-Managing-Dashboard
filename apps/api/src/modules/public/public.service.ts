import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { nextNumber } from "../../utils/numberSequence";
import { writeAuditLog } from "../../utils/audit";
import { scoreLead } from "../ai/leadScoring";
import { IntakeLeadInput } from "./public.validation";

export const publicService = {
  /**
   * Unauthenticated lead intake for embedded web forms / marketing webhooks
   * (PRD US-1.1: "manual + campaign/web form auto-create"). The webhookToken
   * is what stands in for auth here — it identifies the tenant without
   * requiring the submitting page to hold a real user session. Leads land
   * as NEW/unassigned, same as a manually created one, for a rep to triage.
   */
  async intakeLead(input: IntakeLeadInput) {
    const company = await prisma.company.findUnique({ where: { webhookToken: input.webhookToken }, select: { id: true } });
    if (!company) throw ApiError.unauthorized("Invalid webhook token");

    const code = await nextNumber(company.id, "LEAD", "LEAD");
    const score = scoreLead({
      source: input.source,
      industry: input.industry,
      email: input.email,
      phone: input.phone,
      contactName: input.contactName,
      companyName: input.companyName,
    });

    const lead = await prisma.lead.create({
      data: {
        company: { connect: { id: company.id } },
        code,
        companyName: input.companyName,
        contactName: input.contactName,
        email: input.email || null,
        phone: input.phone || null,
        source: input.source,
        industry: input.industry,
        notes: input.notes,
        score,
        scoreUpdatedAt: new Date(),
      },
    });

    await writeAuditLog({
      companyId: company.id,
      actorId: null,
      entityType: "Lead",
      entityId: lead.id,
      action: "CREATE_VIA_WEBHOOK",
      after: lead,
    });

    return { id: lead.id, code: lead.code };
  },
};
