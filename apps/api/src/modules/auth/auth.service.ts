import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { generateOtpCode, hashOtpCode, compareOtpCode } from "../../utils/otp";
import { sendOtpSms } from "../../services/unifonic";
import { issueTokenPair, verifyRefreshToken } from "../../services/jwt";
import { verifyGoogleIdToken } from "../../services/googleAuth";
import { verifyAppleIdToken } from "../../services/appleAuth";
import { toPublicUser } from "../users/users.service";
import type { User } from "@prisma/client";

// Re-fetches with the city relation loaded so the response shape matches
// GET /users/me exactly — the queries above only need id/status, not city.
async function authResult(user: User) {
  const { accessToken, refreshToken } = issueTokenPair(user.id);
  const withCity = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { city: true } });
  return { accessToken, refreshToken, user: toPublicUser(withCity) };
}

export async function requestOtp(phoneNumber: string): Promise<{ expiresInMinutes: number }> {
  const code = generateOtpCode();
  const codeHash = await hashOtpCode(code);
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.$transaction([
    // Invalidate any still-pending OTPs for this number so only the latest
    // code — and its own attempt counter — is ever valid.
    prisma.otpVerification.updateMany({
      where: { phoneNumber, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.otpVerification.create({
      data: { phoneNumber, codeHash, expiresAt },
    }),
  ]);

  await sendOtpSms(phoneNumber, code);

  return { expiresInMinutes: env.OTP_EXPIRY_MINUTES };
}

export async function verifyOtp(phoneNumber: string, code: string) {
  const otp = await prisma.otpVerification.findFirst({
    where: { phoneNumber, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    throw AppError.badRequest("OTP_NOT_FOUND", "No pending verification code for this number. Request a new one.");
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    throw AppError.badRequest("OTP_EXPIRED", "This code has expired. Request a new one.");
  }

  if (otp.attemptCount >= env.OTP_MAX_ATTEMPTS) {
    throw AppError.tooManyRequests("OTP_LOCKED", "Too many incorrect attempts. Request a new code.");
  }

  const matches = await compareOtpCode(code, otp.codeHash);
  if (!matches) {
    const attemptCount = otp.attemptCount + 1;
    await prisma.otpVerification.update({ where: { id: otp.id }, data: { attemptCount } });
    const attemptsRemaining = Math.max(0, env.OTP_MAX_ATTEMPTS - attemptCount);
    throw AppError.badRequest("INVALID_OTP", "Incorrect code.", { attemptsRemaining });
  }

  await prisma.otpVerification.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

  let user = await prisma.user.findUnique({ where: { phoneNumber } });
  if (!user) {
    user = await prisma.user.create({ data: { phoneNumber, authProvider: "PHONE" } });
  }

  if (user.status !== "ACTIVE") {
    throw AppError.forbidden("ACCOUNT_SUSPENDED", "This account has been suspended. Contact support.");
  }

  return authResult(user);
}

export async function refreshSession(refreshToken: string) {
  let userId: string;
  try {
    userId = verifyRefreshToken(refreshToken).sub;
  } catch {
    throw AppError.unauthorized("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized("INVALID_REFRESH_TOKEN", "User no longer exists");
  if (user.status !== "ACTIVE") {
    throw AppError.forbidden("ACCOUNT_SUSPENDED", "This account has been suspended. Contact support.");
  }

  return authResult(user);
}

export async function loginWithGoogle(idToken: string) {
  const profile = await verifyGoogleIdToken(idToken);

  let user = await prisma.user.findUnique({ where: { googleSub: profile.sub } });
  if (!user && profile.email) {
    user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (user) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleSub: profile.sub } });
    }
  }
  if (!user) {
    user = await prisma.user.create({
      data: {
        googleSub: profile.sub,
        email: profile.email,
        displayName: profile.name,
        profilePhotoUrl: profile.picture,
        authProvider: "GOOGLE",
      },
    });
  }

  if (user.status !== "ACTIVE") {
    throw AppError.forbidden("ACCOUNT_SUSPENDED", "This account has been suspended. Contact support.");
  }

  return authResult(user);
}

export async function loginWithApple(idToken: string, displayName?: string) {
  const profile = await verifyAppleIdToken(idToken);

  let user = await prisma.user.findUnique({ where: { appleSub: profile.sub } });
  if (!user && profile.email) {
    user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (user) {
      user = await prisma.user.update({ where: { id: user.id }, data: { appleSub: profile.sub } });
    }
  }
  if (!user) {
    user = await prisma.user.create({
      data: {
        appleSub: profile.sub,
        email: profile.email,
        displayName,
        authProvider: "APPLE",
      },
    });
  }

  if (user.status !== "ACTIVE") {
    throw AppError.forbidden("ACCOUNT_SUSPENDED", "This account has been suspended. Contact support.");
  }

  return authResult(user);
}
