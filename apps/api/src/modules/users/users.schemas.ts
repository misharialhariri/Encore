import { z } from "zod";
import { GULF_SIZES } from "../catalog/sizeChart";

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  profilePhotoUrl: z.string().url().optional(),
  cityId: z.string().uuid().optional(),
  userType: z.enum(["BUYER", "RESELLER", "BOTH"]).optional(),
  languagePref: z.enum(["ar", "en"]).optional(),
  biometricEnabled: z.boolean().optional(),
  preferredSizes: z.array(z.enum(GULF_SIZES as [string, ...string[]])).max(5).optional(),
});

export const presignPhotoSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
