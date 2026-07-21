import { Router } from "express";
import { calendarController } from "./calendar.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.CALENDAR_VIEW), asyncHandler(calendarController.list));
router.get("/:id", authorize(PERMISSIONS.CALENDAR_VIEW), asyncHandler(calendarController.getById));
router.post("/", authorize(PERMISSIONS.CALENDAR_MANAGE), asyncHandler(calendarController.create));
router.patch("/:id", authorize(PERMISSIONS.CALENDAR_MANAGE), asyncHandler(calendarController.update));

export default router;
