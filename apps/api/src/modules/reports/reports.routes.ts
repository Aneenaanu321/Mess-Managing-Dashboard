import { Router } from "express";
import { reportsController } from "./reports.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();
router.use(authenticate);

router.get(
  "/executive",
  authorize(PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_EXECUTIVE),
  asyncHandler(reportsController.executive),
);
router.get("/summary", authorize(PERMISSIONS.REPORTS_VIEW), asyncHandler(reportsController.summary));
router.get("/receivables-aging", authorize(PERMISSIONS.REPORTS_VIEW), asyncHandler(reportsController.receivablesAging));

export default router;
