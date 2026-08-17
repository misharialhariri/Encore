import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  type: "refresh";
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "access" } satisfies AccessTokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as SignOptions);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" } satisfies RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (decoded.type !== "access") throw new Error("Not an access token");
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  if (decoded.type !== "refresh") throw new Error("Not a refresh token");
  return decoded;
}

export function issueTokenPair(userId: string) {
  return {
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId),
  };
}

export interface AdminAccessTokenPayload {
  sub: string;
  role: string;
  type: "admin_access";
}

// Deliberately signed with a separate secret (JWT_ADMIN_SECRET) from the
// buyer/reseller tokens above, so a leaked admin token can't be replayed
// against user-facing endpoints or vice versa.
export function signAdminAccessToken(adminId: string, role: string): string {
  return jwt.sign({ sub: adminId, role, type: "admin_access" } satisfies AdminAccessTokenPayload, env.JWT_ADMIN_SECRET, {
    expiresIn: env.JWT_ADMIN_TTL,
  } as SignOptions);
}

export function verifyAdminAccessToken(token: string): AdminAccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ADMIN_SECRET) as AdminAccessTokenPayload;
  if (decoded.type !== "admin_access") throw new Error("Not an admin access token");
  return decoded;
}
