import { RequestHandler } from "express";
import * as listingsService from "./listings.service";
import { getPlatformSettingNumber } from "../../services/platformSettings";
import { SIZE_CHART } from "../catalog/sizeChart";
import { COLOR_PALETTE } from "../catalog/colorPalette";
import {
  createListingSchema,
  listMineQuerySchema,
  listingStatusSchema,
  presignListingPhotoSchema,
  updateListingSchema,
} from "./listings.schemas";

export const getMeta: RequestHandler = async (_req, res) => {
  const [maxPhotosPerListing, minListingPriceSar] = await Promise.all([
    getPlatformSettingNumber("max_photos_per_listing", 10),
    getPlatformSettingNumber("min_listing_price_sar", 0),
  ]);

  res.json({
    conditions: ["NEW_WITH_TAGS", "LIKE_NEW", "GOOD", "FAIR"],
    occasionTypes: ["WEDDING_GUEST", "FORMAL", "SEMI_FORMAL", "COCKTAIL"],
    colors: COLOR_PALETTE,
    sizeChart: SIZE_CHART,
    maxPhotosPerListing,
    minListingPriceSar,
  });
};

export const presignPhoto: RequestHandler = async (req, res) => {
  const { contentType } = presignListingPhotoSchema.parse(req.body);
  const result = await listingsService.presignListingPhoto(contentType);
  res.json(result);
};

export const create: RequestHandler = async (req, res) => {
  const input = createListingSchema.parse(req.body);
  const listing = await listingsService.createListing(req.userId!, input);
  res.status(201).json({ listing });
};

export const listMine: RequestHandler = async (req, res) => {
  const { status } = listMineQuerySchema.parse(req.query);
  const listings = await listingsService.listMine(req.userId!, status);
  res.json({ listings });
};

export const getDetail: RequestHandler = async (req, res) => {
  const listing = await listingsService.getListingDetail(req.params.id, req.userId);
  res.json({ listing });
};

export const update: RequestHandler = async (req, res) => {
  const input = updateListingSchema.parse(req.body);
  const listing = await listingsService.updateListing(req.params.id, req.userId!, input);
  res.json({ listing });
};

export const setStatus: RequestHandler = async (req, res) => {
  const { status } = listingStatusSchema.parse(req.body);
  const listing = await listingsService.setListingStatus(req.params.id, req.userId!, status);
  res.json({ listing });
};
