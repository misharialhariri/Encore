import { apiClient } from "./client";

export type PayoutStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED";

export interface AdminPayout {
  id: string;
  amount: number;
  status: PayoutStatus;
  requestedAt: string;
  processedAt: string | null;
  reseller: { id: string; displayName: string | null; phoneNumber: string | null };
}

export async function getPayouts(status?: PayoutStatus): Promise<AdminPayout[]> {
  const { data } = await apiClient.get("/admin/payouts", { params: status ? { status } : undefined });
  return data.payouts;
}

export async function markProcessing(id: string): Promise<AdminPayout> {
  const { data } = await apiClient.post(`/admin/payouts/${id}/mark-processing`);
  return data.payout;
}

export async function markPaid(id: string): Promise<AdminPayout> {
  const { data } = await apiClient.post(`/admin/payouts/${id}/mark-paid`);
  return data.payout;
}

export async function markFailed(id: string): Promise<AdminPayout> {
  const { data } = await apiClient.post(`/admin/payouts/${id}/mark-failed`);
  return data.payout;
}
