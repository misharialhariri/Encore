import { apiClient } from "./client";

export interface ResellerProfile {
  id: string;
  displayName: string | null;
  profilePhotoUrl: string | null;
  city: { nameEn: string; nameAr: string } | null;
  memberSince: string;
  isVerified: boolean;
  totalSold: number;
  averageRating: number | null;
  reviewCount: number;
  activeListings: { id: string; title: string; askingPrice: number; coverImageUrl: string | null }[];
}

export async function getResellerProfile(id: string): Promise<ResellerProfile> {
  const { data } = await apiClient.get(`/resellers/${id}`);
  return data.reseller;
}
