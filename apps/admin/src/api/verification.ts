import { apiClient } from "./client";

export interface AdminVerificationRequest {
  id: string;
  idDocumentUrl: string;
  documentType: "NATIONAL_ID" | "IQAMA";
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewedAt: string | null;
  user: { id: string; displayName: string | null; phoneNumber: string | null };
}

export async function getPendingRequests(): Promise<AdminVerificationRequest[]> {
  const { data } = await apiClient.get("/admin/verification-requests");
  return data.requests;
}

export async function approveRequest(id: string): Promise<AdminVerificationRequest> {
  const { data } = await apiClient.post(`/admin/verification-requests/${id}/approve`);
  return data.request;
}

export async function rejectRequest(id: string, reason?: string): Promise<AdminVerificationRequest> {
  const { data } = await apiClient.post(`/admin/verification-requests/${id}/reject`, { reason });
  return data.request;
}
