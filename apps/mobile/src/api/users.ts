import { apiClient } from "./client";
import type { AuthUser } from "../store/authStore";

export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get("/users/me");
  return data.user;
}

export interface UpdateProfileInput {
  displayName?: string;
  profilePhotoUrl?: string;
  cityId?: string;
  userType?: "BUYER" | "RESELLER" | "BOTH";
  languagePref?: "ar" | "en";
  biometricEnabled?: boolean;
}

export async function updateMe(input: UpdateProfileInput): Promise<AuthUser> {
  const { data } = await apiClient.put("/users/me", input);
  return data.user;
}

export async function getProfilePhotoUploadUrl(
  contentType: "image/jpeg" | "image/png" | "image/webp"
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const { data } = await apiClient.post("/users/me/photo-upload-url", { contentType });
  return data;
}

export async function uploadProfilePhoto(uploadUrl: string, fileUri: string, contentType: string): Promise<void> {
  const fileBlob = await (await fetch(fileUri)).blob();
  await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: fileBlob });
}
