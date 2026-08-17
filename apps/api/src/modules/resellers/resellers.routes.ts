import { Router } from "express";
import { getResellerProfile } from "./resellers.service";
import { listReviewsForReseller } from "../reviews/reviews.service";

export const resellersRouter = Router();

resellersRouter.get("/:id", async (req, res) => {
  const profile = await getResellerProfile(req.params.id);
  res.json({ reseller: profile });
});

resellersRouter.get("/:id/reviews", async (req, res) => {
  const reviews = await listReviewsForReseller(req.params.id);
  res.json({ reviews });
});
