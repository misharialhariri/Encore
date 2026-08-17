import { apiClient } from "./client";

export interface AdminDispute {
  id: string;
  reason: string;
  description: string;
  evidencePhotos: string[];
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED";
  resolution: string | null;
  openedAt: string;
  deadlineAt: string;
  resolvedAt: string | null;
  buyer: { id: string; displayName: string | null; phoneNumber: string | null };
  order: { id: string; title: string; resellerId: string; totalAmount: number; escrowStatus: string | null };
}

export async function getOpenDisputes(): Promise<AdminDispute[]> {
  const { data } = await apiClient.get("/admin/disputes");
  return data.disputes;
}

export async function resolveDispute(
  id: string,
  outcome: "RELEASE_TO_RESELLER" | "REFUND_BUYER",
  resolution: string
): Promise<AdminDispute> {
  const { data } = await apiClient.post(`/admin/disputes/${id}/resolve`, { outcome, resolution });
  return data.dispute;
}
