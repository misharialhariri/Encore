import { z } from "zod";
import { normalizeSaudiPhone } from "../../utils/phone";

const saudiPhone = z.string().transform((value, ctx) => {
  const normalized = normalizeSaudiPhone(value);
  if (!normalized) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid Saudi mobile number (+966 5XXXXXXXX)" });
    return z.NEVER;
  }
  return normalized;
});

export const requestOtpSchema = z.object({
  phoneNumber: saudiPhone,
});

export const verifyOtpSchema = z.object({
  phoneNumber: saudiPhone,
  code: z.string().length(6, "OTP code must be 6 digits"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(10),
});

export const appleLoginSchema = z.object({
  idToken: z.string().min(10),
  displayName: z.string().min(1).max(100).optional(),
});
