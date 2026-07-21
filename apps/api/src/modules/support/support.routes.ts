import { Router } from "express";
import { supportController } from "./support.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.SUPPORT_VIEW), asyncHandler(supportController.list));
router.get("/:id", authorize(PERMISSIONS.SUPPORT_VIEW), asyncHandler(supportController.getById));
router.post("/", authorize(PERMISSIONS.SUPPORT_MANAGE), asyncHandler(supportController.create));
router.patch("/:id", authorize(PERMISSIONS.SUPPORT_MANAGE), asyncHandler(supportController.update));
router.post("/:id/comments", authorize(PERMISSIONS.SUPPORT_MANAGE), asyncHandler(supportController.addComment));

export default router;
