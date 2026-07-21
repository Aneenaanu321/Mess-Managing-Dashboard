import { Router } from "express";
import { settingsController } from "./settings.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();
router.use(authenticate);
// Any of the three settings permissions grants read access to this module's
// sections; write/manage actions (v2) will split back out per-section.
router.use(
  authorize(PERMISSIONS.SETTINGS_MANAGE_ORG, PERMISSIONS.SETTINGS_MANAGE_ROLES, PERMISSIONS.SETTINGS_MANAGE_CATALOG),
);

router.get("/org", asyncHandler(settingsController.org));
router.get("/roles", asyncHandler(settingsController.roles));
router.get("/users", asyncHandler(settingsController.users));
router.get("/sequences", asyncHandler(settingsController.sequences));
router.get("/audit-log", asyncHandler(settingsController.auditLog));

export default router;
