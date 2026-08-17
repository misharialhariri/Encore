import { z } from "zod";

export const createReportSchema = z
  .object({
    targetType: z.enum(["LISTING", "USER"]),
    listingId: z.string().uuid().optional(),
    reportedUserId: z.string().uuid().optional(),
    reason: z.enum(["WRONG_CATEGORY", "FAKE_PHOTOS", "PROHIBITED_ITEM", "SCAM", "HARASSMENT", "FAKE_ACCOUNT", "OTHER"]),
    description: z.string().trim().max(500).optional(),
  })
  .refine((data) => (data.targetType === "LISTING" ? Boolean(data.listingId) : Boolean(data.reportedUserId)), {
    message: "listingId is required for LISTING reports, reportedUserId for USER reports",
  });
