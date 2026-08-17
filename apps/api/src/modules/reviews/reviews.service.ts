import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { notify, NotificationType } from "../../services/notifications";
import type { z } from "zod";
import type { createReviewSchema, respondToReviewSchema } from "./reviews.schemas";

const REVIEWER_SELECT = { id: true, displayName: true, profilePhotoUrl: true } as const;

function toPublicReview(review: {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  resellerResponse: string | null;
  createdAt: Date;
  reviewer: { id: string; displayName: string | null; profilePhotoUrl: string | null };
}) {
  return {
    id: review.id,
    orderId: review.orderId,
    rating: review.rating,
    comment: review.comment,
    resellerResponse: review.resellerResponse,
    createdAt: review.createdAt,
    reviewer: review.reviewer,
  };
}

type CreateReviewInput = z.infer<typeof createReviewSchema>;
type RespondInput = z.infer<typeof respondToReviewSchema>;

export async function createReview(buyerId: string, input: CreateReviewInput) {
  const order = await prisma.order.findUnique({ where: { id: input.orderId }, include: { listing: true } });
  if (!order) throw AppError.notFound("ORDER_NOT_FOUND", "Order not found");
  if (order.buyerId !== buyerId) throw AppError.forbidden("NOT_ORDER_BUYER", "Only the buyer can review this order");
  if (order.status !== "COMPLETED") {
    throw AppError.badRequest("ORDER_NOT_COMPLETED", "You can only review a completed order");
  }

  const existing = await prisma.review.findUnique({ where: { orderId: input.orderId } });
  if (existing) throw AppError.badRequest("ALREADY_REVIEWED", "You've already reviewed this order");

  const review = await prisma.review.create({
    data: {
      orderId: input.orderId,
      reviewerId: buyerId,
      resellerId: order.resellerId,
      rating: input.rating,
      comment: input.comment,
    },
    include: { reviewer: { select: REVIEWER_SELECT } },
  });

  await notify(order.resellerId, NotificationType.REVIEW_RECEIVED, {
    title: "New review",
    body: `You received a ${input.rating}-star review for "${order.listing.title}"`,
    data: { orderId: order.id, reviewId: review.id },
  });

  return toPublicReview(review);
}

export async function respondToReview(resellerId: string, reviewId: string, input: RespondInput) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw AppError.notFound("REVIEW_NOT_FOUND", "Review not found");
  if (review.resellerId !== resellerId) throw AppError.forbidden("NOT_REVIEW_SUBJECT", "This review isn't about you");

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { resellerResponse: input.response },
    include: { reviewer: { select: REVIEWER_SELECT } },
  });
  return toPublicReview(updated);
}

export async function getReviewForOrder(orderId: string) {
  const review = await prisma.review.findUnique({
    where: { orderId },
    include: { reviewer: { select: REVIEWER_SELECT } },
  });
  return review ? toPublicReview(review) : null;
}

export async function listReviewsForReseller(resellerId: string) {
  const reviews = await prisma.review.findMany({
    where: { resellerId },
    include: { reviewer: { select: REVIEWER_SELECT } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return reviews.map(toPublicReview);
}
