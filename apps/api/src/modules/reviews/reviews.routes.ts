import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import * as reviewsService from "./reviews.service";
import { createReviewSchema, respondToReviewSchema } from "./reviews.schemas";

export const reviewsRouter = Router();

reviewsRouter.use(requireAuth);

reviewsRouter.post("/", async (req, res) => {
  const input = createReviewSchema.parse(req.body);
  const review = await reviewsService.createReview(req.userId!, input);
  res.status(201).json({ review });
});

reviewsRouter.get("/by-order/:orderId", async (req, res) => {
  const review = await reviewsService.getReviewForOrder(req.params.orderId);
  res.json({ review });
});

reviewsRouter.post("/:id/response", async (req, res) => {
  const input = respondToReviewSchema.parse(req.body);
  const review = await reviewsService.respondToReview(req.userId!, req.params.id, input);
  res.json({ review });
});
