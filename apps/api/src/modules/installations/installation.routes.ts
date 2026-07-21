import { Router } from "express";
import { installationController } from "./installation.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

// Installations reuses Project permissions — it's a filtered read view over
// Project, not a distinct entity.
router.get("/", authorize(PERMISSIONS.PROJECT_VIEW), asyncHandler(installationController.list));

export default router;
