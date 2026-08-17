import { apiClient } from "./client";
import type { ListingCard } from "./search";

export async function getWishlist(): Promise<ListingCard[]> {
  const { data } = await apiClient.get("/wishlist");
  return data.listings;
}

export async function addToWishlist(listingId: string): Promise<void> {
  await apiClient.post(`/wishlist/${listingId}`);
}

export async function removeFromWishlist(listingId: string): Promise<void> {
  await apiClient.delete(`/wishlist/${listingId}`);
}
