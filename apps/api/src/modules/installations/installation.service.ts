import { ProjectStatus } from "@prisma/client";
import { projectRepository } from "../projects/project.repository";
import { ListInstallationsQuery } from "./installation.validation";

interface ActorCtx {
  companyId: string;
  branchId: string | null;
  userId: string;
}

/**
 * "Installations" is a delivery-phase view over Projects rather than its own
 * table: a project is "in installation" from the moment engineering starts
 * on-site work through go-live. This keeps a single source of truth
 * (Project.status + ProjectMilestone) instead of duplicating state.
 */
export const INSTALLATION_PHASE_STATUSES: ProjectStatus[] = [
  "ENGINEER_ASSIGNED",
  "INSTALLATION_IN_PROGRESS",
  "INSTALLATION_COMPLETE",
  "CONFIGURATION_COMPLETE",
  "TESTING_COMPLETE",
  "TRAINING_COMPLETE",
  "GO_LIVE",
];

export const installationService = {
  async list(ctx: ActorCtx, query: ListInstallationsQuery) {
    return projectRepository.list({
      companyId: ctx.companyId,
      statusIn: INSTALLATION_PHASE_STATUSES,
      ...query,
    });
  },
};
