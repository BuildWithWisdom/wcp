import { Request, Response, NextFunction } from "express";

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidDeviceId(value: string): boolean {
  return UUID_V4_RE.test(value);
}

const headerError = (res: Response, message: string): void => {
  res.status(400).json({ success: false, message });
};

/**
 * Requires a valid X-Device-Id (UUID v4) header; sets req.deviceId.
 */
export function requireDeviceId(req: Request, res: Response, next: NextFunction): void {
  const raw = req.header("x-device-id");
  if (!raw) {
    headerError(res, "Missing X-Device-Id header (UUID v4 required).");
    return;
  }
  if (!isValidDeviceId(raw)) {
    headerError(res, "Invalid X-Device-Id header (must be a UUID v4).");
    return;
  }
  req.deviceId = raw;
  next();
}

/**
 * Accepts an optional X-Device-Id; rejects malformed values instead of ignoring them.
 */
export function optionalDeviceId(req: Request, res: Response, next: NextFunction): void {
  const raw = req.header("x-device-id");
  if (!raw) {
    next();
    return;
  }
  if (!isValidDeviceId(raw)) {
    headerError(res, "Invalid X-Device-Id header (must be a UUID v4).");
    return;
  }
  req.deviceId = raw;
  next();
}
