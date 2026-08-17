import axios from "axios";
import { API_URL } from "../config";

const STORAGE_KEY = "encore_admin_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export const apiClient = axios.create({ baseURL: API_URL, timeout: 15000 });

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 here always means the admin token is missing/invalid/expired —
// there's no refresh flow, so the only correct move is to sign out and
// send the admin back to the login screen.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearStoredToken();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const apiError = (error.response?.data as { error?: { message?: string } } | undefined)?.error;
    if (apiError?.message) return apiError.message;
  }
  return fallback;
}
