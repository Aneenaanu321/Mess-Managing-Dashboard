import { ApiError } from "./ApiError";

/**
 * Narrows a possibly-undefined value (common with `noUncheckedIndexedAccess`
 * on route params / lookups) into a definite value, throwing a clean 400
 * instead of letting `undefined` silently propagate into a Prisma `where`
 * clause.
 */
export function requireParam(value: string | undefined, name: string): string {
  if (!value) throw ApiError.badRequest(`Missing required parameter: ${name}`);
  return value;
}

export function assertDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
