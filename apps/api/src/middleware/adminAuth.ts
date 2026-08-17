import { NextFunction, Request, Response } from "express";
import { verifyAdminAccessToken } from "../services/jwt";
import { AppError } from "../utils/AppError";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminId?: string;
      adminRole?: string;
    }
  }
}

export function requireAdminAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("MISSING_TOKEN", "Authorization header with a Bearer token is required");
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAdminAccessToken(token);
    req.adminId = payload.sub;
    req.adminRole = payload.role;
    next();
  } catch {
    throw AppError.unauthorized("INVALID_TOKEN", "Admin access token is invalid or expired");
  }
}

// SUPER_ADMIN can always act; every other role must be explicitly listed.
export function requireAdminRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.adminRole === "SUPER_ADMIN" || (req.adminRole && roles.includes(req.adminRole))) {
      next();
      return;
    }
    throw AppError.forbidden("INSUFFICIENT_ADMIN_ROLE", "Your admin role can't perform this action");
  };
}
