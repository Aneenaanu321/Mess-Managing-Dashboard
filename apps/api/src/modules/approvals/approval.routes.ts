import { Router } from "express";
import { approvalController } from "./approval.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.APPROVAL_VIEW), asyncHandler(approvalController.list));
router.post("/:id/decide", authorize(PERMISSIONS.APPROVAL_DECIDE), asyncHandler(approvalController.decide));

export default router;
