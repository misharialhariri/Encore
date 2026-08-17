import { z } from "zod";

export const resolveDisputeSchema = z.object({
  outcome: z.enum(["RELEASE_TO_RESELLER", "REFUND_BUYER"]),
  resolution: z.string().trim().min(1).max(1000),
});
