import { apiClient } from "./client";

export interface City {
  id: string;
  nameEn: string;
  nameAr: string;
  regionId: string;
}

export interface Region {
  id: string;
  nameEn: string;
  nameAr: string;
  cities: City[];
}

export async function getRegions(): Promise<Region[]> {
  const { data } = await apiClient.get("/regions");
  return data.regions;
}
