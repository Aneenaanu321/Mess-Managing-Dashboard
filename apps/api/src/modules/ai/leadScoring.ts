import { Industry, LeadSource } from "@prisma/client";

/**
 * AI Lead Scoring — v1 heuristic implementation.
 *
 * Rationale: a deterministic, explainable rule-based score ships now so the
 * Lead module is fully functional without an external AI dependency or API
 * key. The scoring function is isolated behind this single call site
 * (`scoreLead`) specifically so it can be swapped for an LLM- or ML-based
 * scorer later (see docs/12-ai-features.md) without touching lead.service.ts
 * — call sites don't know or care whether the score came from rules or a
 * model.
 *
 * Score components (0-100):
 *  - Source quality (referrals/partners convert far better than cold calls)
 *  - Industry fit (industries with proven RFID ROI score higher)
 *  - Data completeness (email + phone + named contact = more workable lead)
 */
const SOURCE_WEIGHT: Record<LeadSource, number> = {
  REFERRAL: 30,
  PARTNER: 28,
  EXHIBITION: 22,
  INBOUND_CALL: 20,
  WEBSITE: 15,
  EMAIL: 16,
  EMAIL_CAMPAIGN: 12,
  WHATSAPP: 18,
  SOCIAL_MEDIA: 10,
  COLD_CALL: 8,
  OTHER: 10,
};

const INDUSTRY_WEIGHT: Record<Industry, number> = {
  RETAIL: 25,
  LUXURY: 25,
  FASHION: 22,
  LOGISTICS: 22,
  WAREHOUSING: 22,
  HEALTHCARE: 20,
  PHARMACEUTICALS: 20,
  MANUFACTURING: 18,
  GOVERNMENT: 15,
  HOSPITALITY: 15,
  EDUCATION: 12,
  OTHER: 10,
};

export interface ScorableLead {
  source: LeadSource;
  industry: Industry;
  email?: string | null;
  phone?: string | null;
  contactName?: string | null;
  companyName?: string | null;
}

export function scoreLead(lead: ScorableLead): number {
  let score = 0;
  score += SOURCE_WEIGHT[lead.source] ?? 10;
  score += INDUSTRY_WEIGHT[lead.industry] ?? 10;

  let completeness = 0;
  if (lead.email) completeness += 15;
  if (lead.phone) completeness += 15;
  if (lead.contactName && lead.contactName.trim().split(" ").length >= 2) completeness += 10;
  if (lead.companyName && lead.companyName.length > 2) completeness += 5;
  score += completeness;

  return Math.max(0, Math.min(100, Math.round(score)));
}
