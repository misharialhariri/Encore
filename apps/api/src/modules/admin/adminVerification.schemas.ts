import { z } from "zod";

export const rejectVerificationSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
