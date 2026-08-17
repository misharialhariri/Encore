import { z } from "zod";

export const createOfferSchema = z.object({
  listingId: z.string().uuid(),
  offerPrice: z.number().positive().max(1_000_000),
});

export const counterOfferSchema = z.object({
  offerPrice: z.number().positive().max(1_000_000),
});
