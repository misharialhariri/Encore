import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import * as wishlistService from "./wishlist.service";

export const wishlistRouter = Router();

wishlistRouter.use(requireAuth);

wishlistRouter.get("/", async (req, res) => {
  const listings = await wishlistService.listWishlist(req.userId!);
  res.json({ listings });
});

wishlistRouter.post("/:listingId", async (req, res) => {
  const result = await wishlistService.addToWishlist(req.userId!, req.params.listingId);
  res.json(result);
});

wishlistRouter.delete("/:listingId", async (req, res) => {
  const result = await wishlistService.removeFromWishlist(req.userId!, req.params.listingId);
  res.json(result);
});
