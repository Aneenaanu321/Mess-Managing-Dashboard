import { Router } from "express";
import { activityController } from "./activity.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.ACTIVITY_VIEW), asyncHandler(activityController.list));
router.post("/", authorize(PERMISSIONS.ACTIVITY_CREATE), asyncHandler(activityController.create));

export default router;
