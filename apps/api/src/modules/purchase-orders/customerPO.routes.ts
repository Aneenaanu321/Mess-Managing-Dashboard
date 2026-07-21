import { Router } from "express";
import { customerPOController } from "./customerPO.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.CUSTOMER_PO_VIEW), asyncHandler(customerPOController.list));
router.get("/:id", authorize(PERMISSIONS.CUSTOMER_PO_VIEW), asyncHandler(customerPOController.getById));
router.post("/", authorize(PERMISSIONS.CUSTOMER_PO_CREATE), asyncHandler(customerPOController.create));
router.post("/:id/verify", authorize(PERMISSIONS.CUSTOMER_PO_CREATE), asyncHandler(customerPOController.verify));
router.post("/:id/record-advance", authorize(PERMISSIONS.CUSTOMER_PO_CREATE), asyncHandler(customerPOController.recordAdvance));

export default router;
