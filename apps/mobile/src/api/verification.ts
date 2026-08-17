import { apiClient } from "./client";

export type VerificationDocType = "NATIONAL_ID" | "IQAMA";
export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface VerificationRequest {
  id: string;
  documentType: VerificationDocType;
  status: VerificationStatus;
  createdAt: string;
  reviewedAt: string | null;
}

export async function submitVerificationRequest(idDocumentUrl: string, documentType: VerificationDocType): Promise<VerificationRequest> {
  const { data } = await apiClient.post("/verification/requests", { idDocumentUrl, documentType });
  return data.request;
}

export async function getMyVerificationRequest(): Promise<VerificationRequest | null> {
  const { data } = await apiClient.get("/verification/requests/me");
  return data.request;
}

export async function getDocumentUploadUrl(
  contentType: "image/jpeg" | "image/png" | "image/webp"
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const { data } = await apiClient.post("/verification/document-upload-url", { contentType });
  return data;
}
