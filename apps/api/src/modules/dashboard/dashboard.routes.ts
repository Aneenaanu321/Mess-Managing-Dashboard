import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();
router.use(authenticate);

router.get(
  "/summary",
  authorize(PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXECUTIVE),
  asyncHandler(dashboardController.summary),
);
router.get(
  "/spotlight",
  authorize(PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXECUTIVE),
  asyncHandler(dashboardController.spotlight),
);
router.get(
  "/branches",
  authorize(PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXECUTIVE),
  asyncHandler(dashboardController.branches),
);

export default router;
