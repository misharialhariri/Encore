import { z } from "zod";

export const updateSettingSchema = z.object({
  value: z.string().trim().min(1).max(500),
});

export const createBannedKeywordSchema = z.object({
  keyword: z.string().trim().min(1).max(100).toLowerCase(),
});
