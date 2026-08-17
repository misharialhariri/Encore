import { apiClient } from "./client";

export interface AdminStats {
  pendingListings: number;
  openReports: number;
  openDisputes: number;
  pendingVerifications: number;
  pendingPayouts: number;
}

export async function getStats(): Promise<AdminStats> {
  const { data } = await apiClient.get("/admin/stats");
  return data;
}
