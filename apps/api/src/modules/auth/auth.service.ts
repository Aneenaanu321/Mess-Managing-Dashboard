import crypto from "node:crypto";
import { RoleKey } from "@prisma/client";
import { authRepository } from "./auth.repository";
import { hashPassword, verifyPassword } from "../../utils/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  newJti,
  refreshExpiryDate,
  AccessTokenPayload,
} from "../../utils/jwt";
import { ApiError } from "../../utils/ApiError";
import { PERMISSIONS } from "../../config/permissions";
import { env } from "../../config/env";
import type { RegisterInput } from "./auth.validation";

type UserWithRole = NonNullable<Awaited<ReturnType<typeof authRepository.findUserByEmail>>>;

const DEMO_COMPANY_ID = "demo-company";
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function buildPermissionKeys(user: UserWithRole): string[] {
  const keys = user.role.permissions.map((rp) => rp.permission.key);
  // Super Admin is seeded with every concrete permission row; also inject the
  // "*:*" wildcard so authorize() short-circuits correctly.
  if (user.role.key === "SUPER_ADMIN" || keys.includes(PERMISSIONS.ALL)) {
    return [PERMISSIONS.ALL, ...keys.filter((k) => k !== PERMISSIONS.ALL)];
  }
  return keys;
}

function toAccessPayload(user: UserWithRole): AccessTokenPayload {
  return {
    sub: user.id,
    companyId: user.companyId,
    branchId: user.branchId,
    roleKey: user.role.key,
    permissions: buildPermissionKeys(user),
    customerId: user.customerId,
  };
}

function toPublicUser(user: UserWithRole) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: { key: user.role.key, name: user.role.name },
    permissions: buildPermissionKeys(user),
    company: { id: user.company.id, name: user.company.name, currency: user.company.currency },
    branch: user.branch ? { id: user.branch.id, name: user.branch.name } : null,
    emailNotifications: user.emailNotifications,
    portalCustomer: user.portalCustomer ? { id: user.portalCustomer.id, name: user.portalCustomer.name } : null,
  };
}

async function issueSession(user: UserWithRole, ip?: string) {
  const accessToken = signAccessToken(toAccessPayload(user));
  const jti = newJti();
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiryDate(),
    createdByIp: ip ?? null,
  });
  await authRepository.touchLastLogin(user.id);

  return { accessToken, refreshToken, user: toPublicUser(user) };
}

export const authService = {
  async login(email: string, password: string, ip?: string) {
    const user = await authRepository.findUserByEmail(email.toLowerCase());
    if (!user || user.status !== "ACTIVE") {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    return issueSession(user, ip);
  },

  async register(input: RegisterInput, ip?: string) {
    const email = input.email.toLowerCase();
    const existing = await authRepository.findUserByEmail(email);
    if (existing) {
      throw ApiError.conflict("An account with this email already exists");
    }

    const company = await authRepository.findCompanyById(DEMO_COMPANY_ID);
    if (!company) {
      throw ApiError.badRequest("Company is not configured yet. Run the database seed first.");
    }

    const role = await authRepository.findRoleByKey(RoleKey.SALES_EXECUTIVE);
    if (!role) {
      throw ApiError.badRequest("Default role is not configured yet. Run the database seed first.");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createUser({
      companyId: company.id,
      branchId: company.branches[0]?.id ?? null,
      roleId: role.id,
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      passwordHash,
    });

    return issueSession(user, ip);
  },

  async forgotPassword(email: string) {
    const user = await authRepository.findUserByEmail(email.toLowerCase());
    // Always return a generic success payload to avoid account enumeration.
    const generic = {
      message: "If an account exists for that email, password reset instructions have been sent.",
      resetToken: null as string | null,
      resetUrl: null as string | null,
    };

    if (!user || user.status !== "ACTIVE") {
      return generic;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    await authRepository.setPasswordResetToken(
      user.id,
      hashToken(rawToken),
      new Date(Date.now() + RESET_TOKEN_TTL_MS),
    );

    const frontendOrigin = env.CORS_ORIGIN.split(",")[0]?.trim() || "http://localhost:3000";
    const resetUrl = `${frontendOrigin}/reset-password?token=${rawToken}`;

    // No email provider wired yet — surface the link in non-production so the flow is usable.
    if (env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.info(`[auth] Password reset link for ${user.email}: ${resetUrl}`);
      return {
        message: generic.message,
        resetToken: rawToken,
        resetUrl,
      };
    }

    return generic;
  },

  async resetPassword(token: string, password: string) {
    const user = await authRepository.findUserByPasswordResetToken(hashToken(token));
    if (!user) {
      throw ApiError.badRequest("This reset link is invalid or has expired");
    }

    const passwordHash = await hashPassword(password);
    await authRepository.updatePassword(user.id, passwordHash);
    return { message: "Password updated successfully. You can sign in with your new password." };
  },

  async refresh(refreshToken: string) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const stored = await authRepository.findRefreshTokenByHash(hashToken(refreshToken));
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw ApiError.unauthorized("Refresh token has been revoked or expired");
    }

    const user = await authRepository.findUserById(decoded.sub);
    if (!user || user.status !== "ACTIVE") {
      throw ApiError.unauthorized("Account no longer active");
    }

    // Rotate: revoke the used token, issue a new pair. Prevents replay of a stolen refresh token
    // beyond a single use.
    await authRepository.revokeRefreshToken(stored.id);
    const newRefreshToken = signRefreshToken({ sub: user.id, jti: newJti() });
    await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: refreshExpiryDate(),
    });

    const accessToken = signAccessToken(toAccessPayload(user));
    return { accessToken, refreshToken: newRefreshToken, user: toPublicUser(user) };
  },

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const stored = await authRepository.findRefreshTokenByHash(hashToken(refreshToken));
    if (stored && !stored.revokedAt) {
      await authRepository.revokeRefreshToken(stored.id);
    }
  },

  async me(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw ApiError.notFound("User not found");
    return toPublicUser(user);
  },

  async updateEmailNotifications(userId: string, emailNotifications: boolean) {
    const user = await authRepository.updateEmailNotifications(userId, emailNotifications);
    return toPublicUser(user);
  },
};

export { PERMISSIONS };
