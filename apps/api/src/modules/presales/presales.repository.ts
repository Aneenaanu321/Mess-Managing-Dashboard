import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

/** All four pre-sales artifacts hang off Opportunity, not Company — tenant
 * isolation is enforced by verifying the opportunity belongs to the caller's
 * company before any read/write (see presales.service.ts). */
async function assertOpportunityInCompany(companyId: string, opportunityId: string) {
  const opportunity = await prisma.opportunity.findFirst({ where: { id: opportunityId, companyId }, select: { id: true } });
  return !!opportunity;
}

export const presalesRepository = {
  assertOpportunityInCompany,

  listSiteSurveys: (opportunityId: string) => prisma.siteSurvey.findMany({ where: { opportunityId }, orderBy: { surveyDate: "desc" } }),
  createSiteSurvey: (data: Prisma.SiteSurveyCreateInput) => prisma.siteSurvey.create({ data }),

  listDemos: (opportunityId: string) => prisma.demoRecord.findMany({ where: { opportunityId }, orderBy: { demoDate: "desc" } }),
  createDemo: (data: Prisma.DemoRecordCreateInput) => prisma.demoRecord.create({ data }),

  listPocs: (opportunityId: string) => prisma.pocRecord.findMany({ where: { opportunityId }, orderBy: { startDate: "desc" } }),
  createPoc: (data: Prisma.PocRecordCreateInput) => prisma.pocRecord.create({ data }),

  listSolutionDesigns: (opportunityId: string) => prisma.solutionDesign.findMany({ where: { opportunityId }, orderBy: { createdAt: "desc" } }),
  createSolutionDesign: (data: Prisma.SolutionDesignCreateInput) => prisma.solutionDesign.create({ data }),
};
