import { Router } from "express";
import { aiController } from "./ai.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();
router.use(authenticate);

router.post("/chat", authorize(PERMISSIONS.AI_ASSISTANT_USE), asyncHandler(aiController.chat));

export default router;
