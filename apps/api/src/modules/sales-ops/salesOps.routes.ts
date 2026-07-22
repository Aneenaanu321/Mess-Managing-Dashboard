import { Router } from "express";
import { salesOpsController } from "./salesOps.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();
router.use(authenticate);

router.get("/worklist", authorize(PERMISSIONS.LEAD_VIEW, PERMISSIONS.APPROVAL_VIEW), asyncHandler(salesOpsController.worklist));
router.get("/handoffs", authorize(PERMISSIONS.OPPORTUNITY_VIEW, PERMISSIONS.CUSTOMER_PO_VIEW), asyncHandler(salesOpsController.handoffs));
router.get("/hygiene", authorize(PERMISSIONS.LEAD_VIEW, PERMISSIONS.CUSTOMER_VIEW), asyncHandler(salesOpsController.hygiene));
router.get("/metrics", authorize(PERMISSIONS.REPORTS_VIEW, PERMISSIONS.LEAD_VIEW), asyncHandler(salesOpsController.metrics));
router.get("/settings", authorize(PERMISSIONS.SETTINGS_MANAGE_ORG, PERMISSIONS.LEAD_ASSIGN), asyncHandler(salesOpsController.getSettings));
router.patch("/settings", authorize(PERMISSIONS.SETTINGS_MANAGE_ORG, PERMISSIONS.LEAD_ASSIGN), asyncHandler(salesOpsController.updateSettings));
router.get("/handovers", authorize(PERMISSIONS.LEAD_VIEW), asyncHandler(salesOpsController.listHandovers));
router.post("/handovers", authorize(PERMISSIONS.LEAD_UPDATE, PERMISSIONS.LEAD_ASSIGN), asyncHandler(salesOpsController.createHandover));
router.get("/deal-summary/:opportunityId", authorize(PERMISSIONS.OPPORTUNITY_VIEW), asyncHandler(salesOpsController.dealSummary));
router.get("/quotation-revisions/:quotationId", authorize(PERMISSIONS.QUOTATION_VIEW), asyncHandler(salesOpsController.quotationRevisions));
router.post("/schedule-meeting", authorize(PERMISSIONS.CALENDAR_MANAGE), asyncHandler(salesOpsController.scheduleMeeting));

export default router;
