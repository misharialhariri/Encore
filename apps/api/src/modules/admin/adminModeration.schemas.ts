import { z } from "zod";

export const rejectListingSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum(["REVIEWED", "ACTIONED"]),
  removeListing: z.boolean().default(false),
});
