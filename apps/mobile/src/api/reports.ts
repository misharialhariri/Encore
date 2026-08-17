import { apiClient } from "./client";

export type ReportReason =
  | "WRONG_CATEGORY"
  | "FAKE_PHOTOS"
  | "PROHIBITED_ITEM"
  | "SCAM"
  | "HARASSMENT"
  | "FAKE_ACCOUNT"
  | "OTHER";

export async function reportListing(listingId: string, reason: ReportReason, description?: string): Promise<void> {
  await apiClient.post("/reports", { targetType: "LISTING", listingId, reason, description });
}
