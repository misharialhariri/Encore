import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const client = new OAuth2Client(env.GOOGLE_OAUTH_CLIENT_ID);

export interface GoogleProfile {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!env.GOOGLE_OAUTH_CLIENT_ID) {
    throw AppError.badRequest("GOOGLE_NOT_CONFIGURED", "Google sign-in is not configured on this server");
  }

  const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_OAUTH_CLIENT_ID }).catch(() => {
    throw AppError.unauthorized("INVALID_GOOGLE_TOKEN", "Google ID token could not be verified");
  });

  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw AppError.unauthorized("INVALID_GOOGLE_TOKEN", "Google ID token did not contain a subject claim");
  }

  return { sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture };
}
