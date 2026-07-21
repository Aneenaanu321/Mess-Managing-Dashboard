import { Router } from "express";
import { vendorController } from "./vendor.controller";
import { supplierPOController } from "./supplierPO.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

// Literal "/vendors" routes must be registered before the "/:id" wildcard below,
// otherwise Express would match "GET /vendors" against "GET /:id" first.
router.get("/vendors", authorize(PERMISSIONS.PROCUREMENT_VIEW), asyncHandler(vendorController.list));
router.post("/vendors", authorize(PERMISSIONS.PROCUREMENT_MANAGE), asyncHandler(vendorController.create));

router.get("/", authorize(PERMISSIONS.PROCUREMENT_VIEW), asyncHandler(supplierPOController.list));
router.get("/:id", authorize(PERMISSIONS.PROCUREMENT_VIEW), asyncHandler(supplierPOController.getById));
router.post("/", authorize(PERMISSIONS.PROCUREMENT_MANAGE), asyncHandler(supplierPOController.create));

export default router;
