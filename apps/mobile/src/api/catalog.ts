import { apiClient } from "./client";

export interface SizeConversion {
  gulf: string;
  eu: string;
  us: string;
  uk: string;
}

export interface ListingMeta {
  conditions: string[];
  occasionTypes: string[];
  colors: string[];
  sizeChart: SizeConversion[];
  maxPhotosPerListing: number;
  minListingPriceSar: number;
}

export interface Brand {
  id: string;
  nameEn: string;
  nameAr: string;
}

export interface StyleTag {
  id: string;
  nameEn: string;
  nameAr: string;
}

export async function getListingMeta(): Promise<ListingMeta> {
  const { data } = await apiClient.get("/listings/meta");
  return data;
}

export async function searchBrands(query?: string): Promise<Brand[]> {
  const { data } = await apiClient.get("/brands", { params: query ? { query } : undefined });
  return data.brands;
}

export async function getStyleTags(): Promise<StyleTag[]> {
  const { data } = await apiClient.get("/style-tags");
  return data.styleTags;
}
