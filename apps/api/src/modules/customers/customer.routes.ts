import { Router } from "express";
import { customerController } from "./customer.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);

router.get("/", authorize(PERMISSIONS.CUSTOMER_VIEW), asyncHandler(customerController.list));
router.get("/:id", authorize(PERMISSIONS.CUSTOMER_VIEW), asyncHandler(customerController.getById));
router.post("/", authorize(PERMISSIONS.CUSTOMER_CREATE), asyncHandler(customerController.create));
router.patch("/:id", authorize(PERMISSIONS.CUSTOMER_UPDATE), asyncHandler(customerController.update));

export default router;
