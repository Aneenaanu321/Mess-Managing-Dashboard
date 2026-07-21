import { Router } from "express";
import { opportunityController } from "./opportunity.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.OPPORTUNITY_VIEW), asyncHandler(opportunityController.list));
router.get("/:id", authorize(PERMISSIONS.OPPORTUNITY_VIEW), asyncHandler(opportunityController.getById));
router.post("/", authorize(PERMISSIONS.OPPORTUNITY_CREATE), asyncHandler(opportunityController.create));
router.patch("/:id", authorize(PERMISSIONS.OPPORTUNITY_UPDATE), asyncHandler(opportunityController.update));
router.post("/:id/stage", authorize(PERMISSIONS.OPPORTUNITY_CHANGE_STAGE), asyncHandler(opportunityController.changeStage));

export default router;
