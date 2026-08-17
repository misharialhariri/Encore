import { apiClient } from "./client";
import type { ListingCard } from "./search";

export interface FeaturedReseller {
  id: string;
  displayName: string | null;
  profilePhotoUrl: string | null;
  city: { nameEn: string } | null;
  activeListingsCount: number;
}

export interface HomeFeed {
  recentlyListed: ListingCard[];
  trending: ListingCard[];
  itemsNearMe: ListingCard[];
  forYou: ListingCard[];
  featuredResellers: FeaturedReseller[];
}

export async function getHomeFeed(): Promise<HomeFeed> {
  const { data } = await apiClient.get("/feed/home");
  return data;
}
