import { Request, Response, NextFunction, RequestHandler } from "express";

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
 */
export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("Centralized Error Handler caught:", error);
  res.status(500).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
};
