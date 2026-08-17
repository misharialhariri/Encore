import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/jwt";
import { AppError } from "../utils/AppError";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("MISSING_TOKEN", "Authorization header with a Bearer token is required");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    throw AppError.unauthorized("INVALID_TOKEN", "Access token is invalid or expired");
  }
}

/**
 * Populates req.userId when a valid bearer token is present, but never
 * rejects the request otherwise — for endpoints that are public but behave
 * differently for an authenticated caller (e.g. a listing's own reseller
 * viewing it shouldn't bump its view count).
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.userId = verifyAccessToken(header.slice("Bearer ".length)).sub;
    } catch {
      // Invalid/expired token on a public route — treat as anonymous rather than erroring.
    }
  }
  next();
}
