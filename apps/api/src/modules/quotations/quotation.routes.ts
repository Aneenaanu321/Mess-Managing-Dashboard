import { Router } from "express";
import { quotationController } from "./quotation.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.QUOTATION_VIEW), asyncHandler(quotationController.list));
router.get("/:id", authorize(PERMISSIONS.QUOTATION_VIEW), asyncHandler(quotationController.getById));
router.post("/", authorize(PERMISSIONS.QUOTATION_CREATE), asyncHandler(quotationController.create));
router.patch("/:id", authorize(PERMISSIONS.QUOTATION_UPDATE), asyncHandler(quotationController.update));
router.post("/:id/send", authorize(PERMISSIONS.QUOTATION_SEND), asyncHandler(quotationController.send));
router.post("/:id/approve", authorize(PERMISSIONS.QUOTATION_APPROVE), asyncHandler(quotationController.approve));
router.get("/:id/pdf", authorize(PERMISSIONS.QUOTATION_VIEW), asyncHandler(quotationController.pdf));

export default router;
