import { apiClient, uploadToPresignedUrl } from "./client";

export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED";

export interface Dispute {
  id: string;
  order: { id: string; title: string; coverImageUrl: string | null; buyerId: string; resellerId: string };
  reason: string;
  description: string;
  evidencePhotos: string[];
  status: DisputeStatus;
  resolution: string | null;
  openedAt: string;
  deadlineAt: string;
  resolvedAt: string | null;
}

export async function openDispute(orderId: string, reason: string, description: string, evidencePhotos: string[]): Promise<Dispute> {
  const { data } = await apiClient.post("/disputes", { orderId, reason, description, evidencePhotos });
  return data.dispute;
}

export async function getMyDisputes(): Promise<Dispute[]> {
  const { data } = await apiClient.get("/disputes/mine");
  return data.disputes;
}

export async function getDispute(id: string): Promise<Dispute> {
  const { data } = await apiClient.get(`/disputes/${id}`);
  return data.dispute;
}

export async function getDisputeForOrder(orderId: string): Promise<Dispute | null> {
  const { data } = await apiClient.get(`/disputes/by-order/${orderId}`);
  return data.dispute;
}

export async function getEvidenceUploadUrl(
  contentType: "image/jpeg" | "image/png" | "image/webp"
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const { data } = await apiClient.post("/disputes/evidence-upload-url", { contentType });
  return data;
}

export const uploadEvidencePhoto = uploadToPresignedUrl;
