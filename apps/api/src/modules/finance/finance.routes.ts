import { Router } from "express";
import { financeController } from "./finance.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.FINANCE_VIEW), asyncHandler(financeController.list));
router.get("/:id", authorize(PERMISSIONS.FINANCE_VIEW), asyncHandler(financeController.getById));
router.post("/", authorize(PERMISSIONS.FINANCE_INVOICE_MANAGE), asyncHandler(financeController.create));
router.patch("/:id", authorize(PERMISSIONS.FINANCE_INVOICE_MANAGE), asyncHandler(financeController.update));
router.post("/:id/payments", authorize(PERMISSIONS.FINANCE_PAYMENT_RECORD), asyncHandler(financeController.recordPayment));

export default router;
