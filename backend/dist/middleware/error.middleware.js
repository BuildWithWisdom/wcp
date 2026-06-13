"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.asyncHandler = void 0;
/**
 * Catches any rejected promises in Express routes and passes them to the errorHandler.
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * Centralized error handler middleware.
 */
const errorHandler = (error, _req, res, _next) => {
    console.error("Centralized Error Handler caught:", error);
    res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
    });
};
exports.errorHandler = errorHandler;
