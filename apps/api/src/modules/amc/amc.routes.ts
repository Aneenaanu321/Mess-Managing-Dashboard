import { Router } from "express";
import { amcController } from "./amc.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.AMC_VIEW), asyncHandler(amcController.list));
router.get("/:id", authorize(PERMISSIONS.AMC_VIEW), asyncHandler(amcController.getById));
router.post("/", authorize(PERMISSIONS.AMC_MANAGE), asyncHandler(amcController.create));
router.patch("/:id", authorize(PERMISSIONS.AMC_MANAGE), asyncHandler(amcController.update));

export default router;
