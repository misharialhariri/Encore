import { apiClient } from "./client";
import type { AuthUser } from "../store/authStore";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export async function requestOtp(phoneNumber: string): Promise<{ expiresInMinutes: number }> {
  const { data } = await apiClient.post("/auth/otp/request", { phoneNumber });
  return data;
}

export async function verifyOtp(phoneNumber: string, code: string): Promise<AuthResponse> {
  const { data } = await apiClient.post("/auth/otp/verify", { phoneNumber, code });
  return data;
}

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post("/auth/social/google", { idToken });
  return data;
}

export async function loginWithApple(idToken: string, displayName?: string): Promise<AuthResponse> {
  const { data } = await apiClient.post("/auth/social/apple", { idToken, displayName });
  return data;
}
