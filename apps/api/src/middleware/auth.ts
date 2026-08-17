import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/jwt";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Checks account status on every request (not just at login) so an admin
// suspending or banning a user takes effect immediately against whatever
// access token they're already holding, rather than waiting for it to expire.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("MISSING_TOKEN", "Authorization header with a Bearer token is required");
  }

  const token = header.slice("Bearer ".length);
  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    throw AppError.unauthorized("INVALID_TOKEN", "Access token is invalid or expired");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!user) throw AppError.unauthorized("INVALID_TOKEN", "Access token is invalid or expired");
  if (user.status === "SUSPENDED") throw AppError.forbidden("ACCOUNT_SUSPENDED", "Your account has been suspended");
  if (user.status === "BANNED") throw AppError.forbidden("ACCOUNT_BANNED", "Your account has been banned");

  req.userId = userId;
  next();
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
