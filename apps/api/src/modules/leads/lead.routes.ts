import { Router } from "express";
import { leadController } from "./lead.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.LEAD_VIEW), asyncHandler(leadController.list));
router.get("/:id", authorize(PERMISSIONS.LEAD_VIEW), asyncHandler(leadController.getById));
router.post("/", authorize(PERMISSIONS.LEAD_CREATE), asyncHandler(leadController.create));
router.post("/bulk-import", authorize(PERMISSIONS.LEAD_CREATE), asyncHandler(leadController.bulkImport));
router.patch("/:id", authorize(PERMISSIONS.LEAD_UPDATE), asyncHandler(leadController.update));
router.post("/:id/assign", authorize(PERMISSIONS.LEAD_ASSIGN), asyncHandler(leadController.assign));
router.post("/:id/disqualify", authorize(PERMISSIONS.LEAD_UPDATE), asyncHandler(leadController.disqualify));
router.post("/:id/convert", authorize(PERMISSIONS.LEAD_CONVERT), asyncHandler(leadController.convert));

export default router;
