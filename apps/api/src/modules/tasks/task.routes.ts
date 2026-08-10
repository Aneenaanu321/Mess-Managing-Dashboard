import { Router } from "express";
import { taskController } from "./task.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.TASK_VIEW), asyncHandler(taskController.list));
router.get("/field-day", authorize(PERMISSIONS.TASK_VIEW), asyncHandler(taskController.fieldDay));
router.get("/sop-templates", authorize(PERMISSIONS.TASK_VIEW), asyncHandler(taskController.sopTemplates));
router.get("/assignable-users", authorize(PERMISSIONS.TASK_VIEW), asyncHandler(taskController.assignableUsers));
router.get("/:id", authorize(PERMISSIONS.TASK_VIEW), asyncHandler(taskController.getById));
router.get("/:id/packing-slip.pdf", authorize(PERMISSIONS.TASK_VIEW), asyncHandler(taskController.packingSlipPdf));
router.post("/", authorize(PERMISSIONS.TASK_UPDATE), asyncHandler(taskController.create));
router.patch("/:id", authorize(PERMISSIONS.TASK_UPDATE), asyncHandler(taskController.update));
router.patch("/:id/sop", authorize(PERMISSIONS.TASK_UPDATE), asyncHandler(taskController.updateSop));
router.post("/:id/acknowledge", authorize(PERMISSIONS.TASK_UPDATE), asyncHandler(taskController.acknowledge));
router.post("/:id/submit", authorize(PERMISSIONS.TASK_UPDATE), asyncHandler(taskController.submit));
router.post("/:id/report-incomplete", authorize(PERMISSIONS.TASK_UPDATE), asyncHandler(taskController.reportIncomplete));
router.post("/:id/return-originals", authorize(PERMISSIONS.TASK_UPDATE), asyncHandler(taskController.returnOriginals));
router.post("/:id/verify", authorize(PERMISSIONS.TASK_UPDATE), asyncHandler(taskController.verify));

export default router;
