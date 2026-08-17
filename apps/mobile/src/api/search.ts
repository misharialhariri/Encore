import { apiClient } from "./client";

export interface ListingCard {
  id: string;
  title: string;
  brand: { nameEn: string } | null;
  sizeGulf: string;
  condition: string;
  askingPrice: number;
  originalPrice: number;
  coverImageUrl: string | null;
  city: { nameEn: string };
  savesCount: number;
  viewsCount: number;
  reseller: { id: string; displayName: string | null; isVerified: boolean };
  createdAt: string;
  isWished: boolean;
}

export type SortOption = "newest" | "price_asc" | "price_desc" | "popular" | "nearest";

export interface SearchFilters {
  q?: string;
  sizes?: string[];
  colors?: string[];
  conditions?: string[];
  occasionTypes?: string[];
  brandIds?: string[];
  priceMin?: number;
  priceMax?: number;
  cityId?: string;
  shippingAvailable?: boolean;
  acceptsOffers?: boolean;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  listings: ListingCard[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

function toQueryParams(filters: SearchFilters) {
  const params: Record<string, string> = {};
  if (filters.q) params.q = filters.q;
  if (filters.sizes?.length) params.sizes = filters.sizes.join(",");
  if (filters.colors?.length) params.colors = filters.colors.join(",");
  if (filters.conditions?.length) params.conditions = filters.conditions.join(",");
  if (filters.occasionTypes?.length) params.occasionTypes = filters.occasionTypes.join(",");
  if (filters.brandIds?.length) params.brandIds = filters.brandIds.join(",");
  if (filters.priceMin != null) params.priceMin = String(filters.priceMin);
  if (filters.priceMax != null) params.priceMax = String(filters.priceMax);
  if (filters.cityId) params.cityId = filters.cityId;
  if (filters.shippingAvailable != null) params.shippingAvailable = String(filters.shippingAvailable);
  if (filters.acceptsOffers != null) params.acceptsOffers = String(filters.acceptsOffers);
  if (filters.sort) params.sort = filters.sort;
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);
  return params;
}

export async function searchListings(filters: SearchFilters): Promise<SearchResult> {
  const { data } = await apiClient.get("/search/listings", { params: toQueryParams(filters) });
  return data;
}

export async function getSearchSuggestions(q: string): Promise<string[]> {
  const { data } = await apiClient.get("/search/suggestions", { params: { q } });
  return data.suggestions;
}
