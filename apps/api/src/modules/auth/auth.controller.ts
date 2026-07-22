import { Request, Response } from "express";
import { authService } from "./auth.service";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePreferencesSchema,
} from "./auth.validation";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";

const REFRESH_COOKIE = "rfidcore_refresh";
const REMEMBER_COOKIE = "rfidcore_remember";
const REMEMBER_MS = 7 * 24 * 60 * 60 * 1000;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/v1/auth",
  };
}

function setSessionCookies(res: Response, refreshToken: string, rememberMe: boolean) {
  const base = baseCookieOptions();
  res.cookie(REFRESH_COOKIE, refreshToken, rememberMe ? { ...base, maxAge: REMEMBER_MS } : base);
  if (rememberMe) {
    res.cookie(REMEMBER_COOKIE, "1", { ...base, maxAge: REMEMBER_MS });
  } else {
    res.clearCookie(REMEMBER_COOKIE, base);
  }
}

function clearSessionCookies(res: Response) {
  const base = baseCookieOptions();
  res.clearCookie(REFRESH_COOKIE, base);
  res.clearCookie(REMEMBER_COOKIE, base);
}

export const authController = {
  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.login(input.email, input.password, req.ip);
    setSessionCookies(res, refreshToken, input.rememberMe);
    res.json({ success: true, data: { accessToken, user, rememberMe: input.rememberMe } });
  },

  async register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.register(input, req.ip);
    setSessionCookies(res, refreshToken, true);
    res.status(201).json({ success: true, data: { accessToken, user } });
  },

  async forgotPassword(req: Request, res: Response) {
    const input = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(input.email);
    res.json({ success: true, data: result });
  },

  async resetPassword(req: Request, res: Response) {
    const input = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(input.token, input.password);
    res.json({ success: true, data: result });
  },

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
    if (!token) throw ApiError.unauthorized("No refresh token provided");
    const { accessToken, refreshToken, user } = await authService.refresh(token);
    const rememberMe = req.cookies?.[REMEMBER_COOKIE] === "1";
    setSessionCookies(res, refreshToken, rememberMe);
    res.json({ success: true, data: { accessToken, user } });
  },

  async logout(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
    await authService.logout(token);
    clearSessionCookies(res);
    res.json({ success: true, data: null });
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(req.auth!.sub);
    res.json({ success: true, data: user });
  },

  async updatePreferences(req: Request, res: Response) {
    const input = updatePreferencesSchema.parse(req.body);
    const user = await authService.updateEmailNotifications(req.auth!.sub, input.emailNotifications);
    res.json({ success: true, data: user });
  },
};
