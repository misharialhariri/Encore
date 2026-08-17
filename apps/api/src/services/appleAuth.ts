import appleSignin from "apple-signin-auth";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

export interface AppleProfile {
  sub: string;
  email?: string;
}

export async function verifyAppleIdToken(idToken: string): Promise<AppleProfile> {
  if (!env.APPLE_CLIENT_ID) {
    throw AppError.badRequest("APPLE_NOT_CONFIGURED", "Apple sign-in is not configured on this server");
  }

  const payload = await appleSignin
    .verifyIdToken(idToken, { audience: env.APPLE_CLIENT_ID, ignoreExpiration: false })
    .catch(() => {
      throw AppError.unauthorized("INVALID_APPLE_TOKEN", "Apple ID token could not be verified");
    });

  return { sub: payload.sub, email: payload.email };
}
