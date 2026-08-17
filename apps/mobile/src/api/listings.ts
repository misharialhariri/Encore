import { apiClient, uploadToPresignedUrl } from "./client";

export type ListingCondition = "NEW_WITH_TAGS" | "LIKE_NEW" | "GOOD" | "FAIR";
export type OccasionType = "WEDDING_GUEST" | "FORMAL" | "SEMI_FORMAL" | "COCKTAIL";
export type ListingStatus = "PENDING_REVIEW" | "ACTIVE" | "PAUSED" | "SOLD" | "REMOVED";

export interface Listing {
  id: string;
  title: string;
  brand: { id: string; nameEn: string; nameAr: string } | null;
  sizeGulf: string;
  sizeIntl: string;
  colors: string[];
  condition: ListingCondition;
  originalPrice: number;
  askingPrice: number;
  occasionType: OccasionType;
  fabricType: string;
  description: string;
  pickupCity: { id: string; nameEn: string; nameAr: string; region: string };
  pickupDistrict: string;
  shippingAvailable: boolean;
  acceptsOffers: boolean;
  status: ListingStatus;
  boostedUntil: string | null;
  viewsCount: number;
  savesCount: number;
  images: { id: string; url: string; position: number }[];
  styleTags: { id: string; nameEn: string; nameAr: string }[];
  reseller: {
    id: string;
    displayName: string | null;
    profilePhotoUrl: string | null;
    isVerified: boolean;
    city: { nameEn: string } | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingInput {
  title: string;
  brandId: string;
  sizeGulf: string;
  colors: string[];
  condition: ListingCondition;
  originalPrice: number;
  askingPrice: number;
  occasionType: OccasionType;
  styleTagIds: string[];
  fabricType: string;
  description: string;
  pickupCityId: string;
  pickupDistrict: string;
  shippingAvailable: boolean;
  acceptsOffers: boolean;
  imageUrls: string[];
}

export async function getListingPhotoUploadUrl(
  contentType: "image/jpeg" | "image/png" | "image/webp"
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const { data } = await apiClient.post("/listings/photo-upload-url", { contentType });
  return data;
}

export const uploadListingPhoto = uploadToPresignedUrl;

export async function createListing(input: CreateListingInput): Promise<Listing> {
  const { data } = await apiClient.post("/listings", input);
  return data.listing;
}

export async function updateListing(id: string, input: Partial<CreateListingInput>): Promise<Listing> {
  const { data } = await apiClient.put(`/listings/${id}`, input);
  return data.listing;
}

export async function getMyListings(status?: ListingStatus): Promise<Listing[]> {
  const { data } = await apiClient.get("/listings/mine", { params: status ? { status } : undefined });
  return data.listings;
}

export async function getListing(id: string): Promise<Listing> {
  const { data } = await apiClient.get(`/listings/${id}`);
  return data.listing;
}

export async function setListingStatus(id: string, status: ListingStatus): Promise<Listing> {
  const { data } = await apiClient.patch(`/listings/${id}/status`, { status });
  return data.listing;
}
