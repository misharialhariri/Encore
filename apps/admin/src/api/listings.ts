import { apiClient } from "./client";

export interface AdminListing {
  id: string;
  title: string;
  description: string;
  askingPrice: number;
  status: string;
  createdAt: string;
  reseller: { id: string; displayName: string | null; phoneNumber: string | null; email: string | null };
  images: string[];
}

export async function getPendingListings(): Promise<AdminListing[]> {
  const { data } = await apiClient.get("/admin/listings");
  return data.listings;
}

export async function approveListing(id: string): Promise<AdminListing> {
  const { data } = await apiClient.post(`/admin/listings/${id}/approve`);
  return data.listing;
}

export async function rejectListing(id: string, reason?: string): Promise<AdminListing> {
  const { data } = await apiClient.post(`/admin/listings/${id}/reject`, { reason });
  return data.listing;
}
