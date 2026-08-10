import { Router } from "express";
import rateLimit from "express-rate-limit";
import { publicController } from "./public.controller";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// No authenticate() here by design — this is meant to be called from a
// public marketing site/form, not a logged-in session. The webhookToken in
// the body is what scopes the request to a tenant (see public.service.ts).
// Tighter than the app-wide limiter (300/min) since this has no auth to
// fall back on for abuse control.
const intakeLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

router.post("/leads", intakeLimiter, asyncHandler(publicController.intakeLead));
router.post("/leads/email", intakeLimiter, asyncHandler(publicController.intakeEmailLead));
router.post("/leads/whatsapp", intakeLimiter, asyncHandler(publicController.intakeWhatsAppLead));

export default router;
