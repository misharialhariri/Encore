import { z } from "zod";

export const createReviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export const respondToReviewSchema = z.object({
  response: z.string().trim().min(1).max(500),
});
