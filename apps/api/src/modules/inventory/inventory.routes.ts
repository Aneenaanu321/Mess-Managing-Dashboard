import { Router } from "express";
import { productController } from "./product.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/products", authorize(PERMISSIONS.INVENTORY_VIEW), asyncHandler(productController.list));
router.get("/products/:id", authorize(PERMISSIONS.INVENTORY_VIEW), asyncHandler(productController.getById));
router.post("/products", authorize(PERMISSIONS.INVENTORY_ADJUST), asyncHandler(productController.create));
router.patch("/products/:id", authorize(PERMISSIONS.INVENTORY_ADJUST), asyncHandler(productController.update));

export default router;
