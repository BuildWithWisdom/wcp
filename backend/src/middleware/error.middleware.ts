import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Error with an HTTP status code intended for client responses.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/**
 * Catches any rejected promises in Express routes and passes them to the errorHandler.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Centralized error handler middleware.
 * ApiError (and errors with a numeric statusCode/status) keep their status;
 * unexpected errors become a generic 500 so internals never leak to clients.
 */
export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const status =
    error instanceof ApiError
      ? error.status
      : typeof (error as any)?.statusCode === "number"
        ? (error as any).statusCode
        : typeof (error as any)?.status === "number"
          ? (error as any).status
          : 500;

  if (status >= 500) {
    console.error("Centralized Error Handler caught:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
    return;
  }

  res.status(status).json({
    success: false,
    message: error.message,
  });
};
