export {};

declare global {
  namespace Express {
    interface Request {
      /** Validated UUID v4 from the X-Device-Id header (device-owned identity until auth ships). */
      deviceId?: string;
    }
  }
}
