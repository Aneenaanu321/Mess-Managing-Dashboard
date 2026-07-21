import { Router } from "express";
import { salesOrderController } from "./salesOrder.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.SALES_ORDER_VIEW), asyncHandler(salesOrderController.list));
router.get("/:id", authorize(PERMISSIONS.SALES_ORDER_VIEW), asyncHandler(salesOrderController.getById));
router.post("/:id/allocate", authorize(PERMISSIONS.SALES_ORDER_MANAGE), asyncHandler(salesOrderController.allocate));

export default router;
