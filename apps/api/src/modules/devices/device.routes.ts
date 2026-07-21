import { Router } from "express";
import { deviceController } from "./device.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.DEVICE_VIEW), asyncHandler(deviceController.list));
router.get("/:id", authorize(PERMISSIONS.DEVICE_VIEW), asyncHandler(deviceController.getById));
router.post("/", authorize(PERMISSIONS.DEVICE_MANAGE), asyncHandler(deviceController.create));
router.patch("/:id", authorize(PERMISSIONS.DEVICE_MANAGE), asyncHandler(deviceController.update));

export default router;
