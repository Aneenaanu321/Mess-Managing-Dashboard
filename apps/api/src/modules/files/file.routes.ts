import { Router } from "express";
import multer from "multer";
import { fileController } from "./file.controller";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../utils/asyncHandler";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB — plenty for PO scans/photos, not so much it becomes a DoS vector
});

const router = Router();

router.use(authenticate);

// Per-entityType permission checks happen in file.service.ts (ENTITY_PERMISSIONS)
// since FileAsset attaches generically to any entity by string id.
router.get("/", asyncHandler(fileController.list));
router.post("/", upload.single("file"), asyncHandler(fileController.upload));
router.get("/:id/download", asyncHandler(fileController.download));

export default router;
