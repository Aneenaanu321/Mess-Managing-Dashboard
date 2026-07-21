import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AccessTokenPayload } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

/**
 * Verifies the JWT access token from the Authorization header and attaches
 * the decoded payload (userId, companyId, branchId, role, permissions) to
 * `req.auth`. This is the ONLY place identity is established — downstream
 * middleware/services trust req.auth, never a client-supplied companyId.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or malformed Authorization header"));
  }

  const token = header.slice("Bearer ".length);

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return next(ApiError.unauthorized("Invalid or expired access token"));
  }
}
