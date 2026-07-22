import { Router } from "express";
import { taskController } from "./task.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.TASK_VIEW), asyncHandler(taskController.list));
router.get("/assignable-users", authorize(PERMISSIONS.TASK_VIEW), asyncHandler(taskController.assignableUsers));
router.get("/:id", authorize(PERMISSIONS.TASK_VIEW), asyncHandler(taskController.getById));
router.post("/", authorize(PERMISSIONS.TASK_UPDATE), asyncHandler(taskController.create));
router.patch("/:id", authorize(PERMISSIONS.TASK_UPDATE), asyncHandler(taskController.update));

export default router;
