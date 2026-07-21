import { prisma } from "../../config/prisma";

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: { include: { permission: true } } } }, company: true, branch: true },
    });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: { include: { permissions: { include: { permission: true } } } }, company: true, branch: true },
    });
  },

  findRoleByKey(key: "SUPER_ADMIN" | "SALES_EXECUTIVE" | string) {
    return prisma.role.findUnique({ where: { key: key as never } });
  },

  findCompanyById(id: string) {
    return prisma.company.findUnique({ where: { id }, include: { branches: { take: 1, orderBy: { createdAt: "asc" } } } });
  },

  createUser(data: {
    companyId: string;
    branchId: string | null;
    roleId: string;
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
  }) {
    return prisma.user.create({
      data,
      include: { role: { include: { permissions: { include: { permission: true } } } }, company: true, branch: true },
    });
  },

  setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordResetToken: tokenHash, passwordResetExpires: expiresAt },
    });
  },

  clearPasswordResetToken(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordResetToken: null, passwordResetExpires: null },
    });
  },

  findUserByPasswordResetToken(tokenHash: string) {
    return prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
    });
  },

  updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordResetToken: null, passwordResetExpires: null },
    });
  },

  createRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date; createdByIp?: string | null }) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  touchLastLogin(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  },
};
