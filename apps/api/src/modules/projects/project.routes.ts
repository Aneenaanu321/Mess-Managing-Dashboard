import { Router } from "express";
import { projectController } from "./project.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.PROJECT_VIEW), asyncHandler(projectController.list));
router.get("/:id", authorize(PERMISSIONS.PROJECT_VIEW), asyncHandler(projectController.getById));
router.post("/", authorize(PERMISSIONS.PROJECT_MANAGE), asyncHandler(projectController.create));
router.patch("/:id", authorize(PERMISSIONS.PROJECT_MANAGE), asyncHandler(projectController.update));
router.patch("/:id/milestones/:milestoneId", authorize(PERMISSIONS.PROJECT_MANAGE), asyncHandler(projectController.updateMilestone));

export default router;
