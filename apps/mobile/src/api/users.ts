import { apiClient, uploadToPresignedUrl } from "./client";
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

export const uploadProfilePhoto = uploadToPresignedUrl;
