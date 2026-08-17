import { z } from "zod";
import { GULF_SIZES } from "../catalog/sizeChart";
import { COLOR_PALETTE } from "../catalog/colorPalette";

const csv = z.preprocess((v) => (typeof v === "string" ? v.split(",").filter(Boolean) : v), z.array(z.string()));

const sizesSchema = csv.pipe(z.array(z.enum(GULF_SIZES as [string, ...string[]]))).default([]);
const colorsSchema = csv.pipe(z.array(z.enum(COLOR_PALETTE as unknown as [string, ...string[]]))).default([]);
const conditionsSchema = csv
  .pipe(z.array(z.enum(["NEW_WITH_TAGS", "LIKE_NEW", "GOOD", "FAIR"])))
  .default([]);
const occasionTypesSchema = csv
  .pipe(z.array(z.enum(["WEDDING_GUEST", "FORMAL", "SEMI_FORMAL", "COCKTAIL"])))
  .default([]);
const brandIdsSchema = csv.pipe(z.array(z.string().uuid())).default([]);

export const searchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  sizes: sizesSchema,
  colors: colorsSchema,
  conditions: conditionsSchema,
  occasionTypes: occasionTypesSchema,
  brandIds: brandIdsSchema,
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().positive().optional(),
  cityId: z.string().uuid().optional(),
  shippingAvailable: z.coerce.boolean().optional(),
  acceptsOffers: z.coerce.boolean().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "popular", "nearest"]).default("newest"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const suggestionsQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});
