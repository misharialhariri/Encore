import { apiClient } from "./client";

export interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  updatedByAdminId: string | null;
  updatedAt: string;
}

export interface BannedKeyword {
  id: string;
  keyword: string;
}

export async function getSettings(): Promise<PlatformSetting[]> {
  const { data } = await apiClient.get("/admin/settings");
  return data.settings;
}

export async function updateSetting(key: string, value: string): Promise<PlatformSetting> {
  const { data } = await apiClient.put(`/admin/settings/${key}`, { value });
  return data.setting;
}

export async function getBannedKeywords(): Promise<BannedKeyword[]> {
  const { data } = await apiClient.get("/admin/banned-keywords");
  return data.keywords;
}

export async function addBannedKeyword(keyword: string): Promise<BannedKeyword> {
  const { data } = await apiClient.post("/admin/banned-keywords", { keyword });
  return data.keyword;
}

export async function removeBannedKeyword(id: string): Promise<void> {
  await apiClient.delete(`/admin/banned-keywords/${id}`);
}
