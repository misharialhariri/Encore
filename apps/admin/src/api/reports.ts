import { apiClient } from "./client";

export interface AdminReport {
  id: string;
  targetType: "LISTING" | "USER";
  listingId: string | null;
  listing: { id: string; title: string; status: string } | null;
  reportedUserId: string | null;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; displayName: string | null; phoneNumber: string | null };
}

export async function getOpenReports(): Promise<AdminReport[]> {
  const { data } = await apiClient.get("/admin/reports");
  return data.reports;
}

export async function resolveReport(id: string, status: "REVIEWED" | "ACTIONED", removeListing = false): Promise<AdminReport> {
  const { data } = await apiClient.post(`/admin/reports/${id}/resolve`, { status, removeListing });
  return data.report;
}
