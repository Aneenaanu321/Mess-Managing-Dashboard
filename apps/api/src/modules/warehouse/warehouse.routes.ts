import { Router } from "express";
import { warehouseController } from "./warehouse.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/warehouses", authorize(PERMISSIONS.INVENTORY_VIEW), asyncHandler(warehouseController.listWarehouses));
router.get("/stock", authorize(PERMISSIONS.INVENTORY_VIEW), asyncHandler(warehouseController.listStock));
router.post(
  "/adjust",
  authorize(PERMISSIONS.INVENTORY_ADJUST, PERMISSIONS.INVENTORY_ALLOCATE),
  asyncHandler(warehouseController.adjust),
);

export default router;
