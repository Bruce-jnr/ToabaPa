import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";
import { AppError } from "../errors/app-error.js";
import { enqueueAlert } from "../alerts/alert-outbox.service.js";
import { errorFingerprint } from "../alerts/alert-redaction.js";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    new AppError(
      404,
      "ROUTE_NOT_FOUND",
      `Route ${req.method} ${req.path} was not found.`,
    ),
  );
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400
  ) {
    res
      .status(400)
      .json({
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Request body must contain valid JSON.",
        },
      });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: error.flatten(),
      },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  logger.error(
    { err: error, method: req.method, path: req.path },
    "Unhandled request error",
  );
  void enqueueAlert({
    code: "UNHANDLED_SERVER_ERROR",
    severity: "P1",
    title: "Repeated unhandled server error",
    operatorAction:
      "Inspect the local error log and restore the failing API path.",
    details: {
      method: req.method,
      path: req.path,
      errorFingerprint: errorFingerprint(error),
    },
    correlationId: String(
      (req as typeof req & { id?: string | number }).id || "",
    ),
    threshold: 3,
    dedupeParts: [req.method, req.path, errorFingerprint(error)],
  });
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
  });
};
