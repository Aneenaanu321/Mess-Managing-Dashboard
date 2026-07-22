import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string; // userId
  companyId: string;
  branchId: string | null;
  roleKey: string;
  permissions: string[];
  // Only set for CUSTOMER_PORTAL_USER — every portal route requires this and
  // scopes its queries to it. Null for every internal-staff role.
  customerId: string | null;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  // @types/jsonwebtoken types `expiresIn` as a template-literal union rather than a plain
  // string, so a value read from validated-but-generically-typed env config needs a cast here.
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string; // random id, hashed copy stored in DB for revocation
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/** Refresh tokens are stored hashed (never plaintext) so a DB leak alone can't be replayed. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newJti(): string {
  return crypto.randomUUID();
}

const MS_PER_UNIT: Record<"s" | "m" | "h" | "d", number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function refreshExpiryDate(): Date {
  const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_EXPIRES_IN);
  const amount = match ? Number(match[1]) : 7;
  const unit = (match?.[2] as keyof typeof MS_PER_UNIT | undefined) ?? "d";
  const ms = MS_PER_UNIT[unit];
  return new Date(Date.now() + amount * ms);
}
