import { apiClient } from "./client";

export interface Review {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  resellerResponse: string | null;
  createdAt: string;
  reviewer: { id: string; displayName: string | null; profilePhotoUrl: string | null };
}

export async function createReview(orderId: string, rating: number, comment?: string): Promise<Review> {
  const { data } = await apiClient.post("/reviews", { orderId, rating, comment });
  return data.review;
}

export async function respondToReview(reviewId: string, response: string): Promise<Review> {
  const { data } = await apiClient.post(`/reviews/${reviewId}/response`, { response });
  return data.review;
}

export async function getResellerReviews(resellerId: string): Promise<Review[]> {
  const { data } = await apiClient.get(`/resellers/${resellerId}/reviews`);
  return data.reviews;
}

export async function getReviewForOrder(orderId: string): Promise<Review | null> {
  const { data } = await apiClient.get(`/reviews/by-order/${orderId}`);
  return data.review;
}
