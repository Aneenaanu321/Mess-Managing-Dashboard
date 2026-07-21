import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "./auth.controller";
import { authenticate } from "../../middleware/authenticate";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Auth endpoints are rate-limited separately to slow brute-force and reset spam.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.post("/login", loginLimiter, asyncHandler(authController.login));
router.post("/register", registerLimiter, asyncHandler(authController.register));
router.post("/forgot-password", forgotLimiter, asyncHandler(authController.forgotPassword));
router.post("/reset-password", forgotLimiter, asyncHandler(authController.resetPassword));
router.post("/refresh", asyncHandler(authController.refresh));
router.post("/logout", asyncHandler(authController.logout));
router.get("/me", authenticate, asyncHandler(authController.me));

export default router;
