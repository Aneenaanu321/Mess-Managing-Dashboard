import { Router } from "express";
import { presalesController } from "./presales.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { asyncHandler } from "../../utils/asyncHandler";
import { PERMISSIONS } from "../../config/permissions";

const router = Router();

router.use(authenticate);
router.use(authorize(PERMISSIONS.OPPORTUNITY_VIEW));

router.get("/site-surveys", asyncHandler(presalesController.listSiteSurveys));
router.get("/demos", asyncHandler(presalesController.listDemos));
router.get("/pocs", asyncHandler(presalesController.listPocs));
router.get("/solution-designs", asyncHandler(presalesController.listSolutionDesigns));

// Middleware chains sequentially, so these write routes require BOTH the
// router.use(...) view check above AND the update check below.
router.post("/site-surveys", authorize(PERMISSIONS.OPPORTUNITY_UPDATE), asyncHandler(presalesController.createSiteSurvey));
router.post("/demos", authorize(PERMISSIONS.OPPORTUNITY_UPDATE), asyncHandler(presalesController.createDemo));
router.post("/pocs", authorize(PERMISSIONS.OPPORTUNITY_UPDATE), asyncHandler(presalesController.createPoc));
router.post("/solution-designs", authorize(PERMISSIONS.OPPORTUNITY_UPDATE), asyncHandler(presalesController.createSolutionDesign));

export default router;
