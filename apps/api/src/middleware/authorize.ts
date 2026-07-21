import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { PERMISSIONS } from "../config/permissions";

/**
 * RBAC enforcement. This is the real security boundary — UI hiding of
 * buttons/menus is a UX convenience only. Every mutating route (and most
 * read routes) must declare its required permission(s) via this middleware.
 *
 * Usage: router.post("/", authenticate, authorize(PERMISSIONS.LEAD_CREATE), controller.create)
 * Multiple permissions = OR (user needs at least one).
 */
export function authorize(...required: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(ApiError.unauthorized());
    }

    const { permissions } = req.auth;

    if (permissions.includes(PERMISSIONS.ALL)) {
      return next();
    }

    const allowed = required.some((perm) => permissions.includes(perm));
    if (!allowed) {
      return next(ApiError.forbidden(`Missing required permission: ${required.join(" or ")}`));
    }

    return next();
  };
}
