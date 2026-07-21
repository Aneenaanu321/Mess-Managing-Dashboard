import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, error: { message: `Route not found: ${req.method} ${req.path}` } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, error: { message: err.message, details: err.details } });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: { message: "Validation failed", details: err.flatten().fieldErrors },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: { message: "A record with these unique values already exists", details: err.meta },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, error: { message: "Record not found" } });
    }
  }

  // Unexpected error — log full detail server-side, never leak internals to the client.
  // eslint-disable-next-line no-console
  console.error("[unhandled error]", err);
  return res.status(500).json({
    success: false,
    error: {
      message: "Internal server error",
      ...(env.NODE_ENV !== "production" && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
}
