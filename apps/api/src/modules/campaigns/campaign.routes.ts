import { Router } from "express";
import { campaignController } from "./campaign.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.CAMPAIGN_VIEW), asyncHandler(campaignController.list));
router.get("/:id", authorize(PERMISSIONS.CAMPAIGN_VIEW), asyncHandler(campaignController.getById));
router.post("/", authorize(PERMISSIONS.CAMPAIGN_MANAGE), asyncHandler(campaignController.create));
router.patch("/:id", authorize(PERMISSIONS.CAMPAIGN_MANAGE), asyncHandler(campaignController.update));

export default router;
