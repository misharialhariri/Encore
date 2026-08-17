import { z } from "zod";
import { GULF_SIZES } from "../catalog/sizeChart";
import { COLOR_PALETTE } from "../catalog/colorPalette";

const conditionEnum = z.enum(["NEW_WITH_TAGS", "LIKE_NEW", "GOOD", "FAIR"]);
const occasionEnum = z.enum(["WEDDING_GUEST", "FORMAL", "SEMI_FORMAL", "COCKTAIL"]);

export const createListingSchema = z.object({
  title: z.string().trim().min(3).max(100),
  brandId: z.string().uuid(),
  sizeGulf: z.enum(GULF_SIZES as [string, ...string[]]),
  colors: z.array(z.enum(COLOR_PALETTE)).min(1).max(5),
  condition: conditionEnum,
  originalPrice: z.number().positive().max(1_000_000),
  askingPrice: z.number().positive().max(1_000_000),
  occasionType: occasionEnum,
  styleTagIds: z.array(z.string().uuid()).min(1).max(6),
  fabricType: z.string().trim().min(1).max(50),
  description: z.string().trim().max(500),
  pickupCityId: z.string().uuid(),
  pickupDistrict: z.string().trim().min(1).max(100),
  shippingAvailable: z.boolean(),
  acceptsOffers: z.boolean(),
  imageUrls: z.array(z.string().url()).min(1).max(10),
});

export const updateListingSchema = createListingSchema.partial();

export const presignListingPhotoSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export const listingStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "SOLD", "REMOVED"]),
});

export const listMineQuerySchema = z.object({
  status: z.enum(["PENDING_REVIEW", "ACTIVE", "PAUSED", "SOLD", "REMOVED"]).optional(),
});
