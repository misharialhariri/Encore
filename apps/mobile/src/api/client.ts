import axios, { AxiosError } from "axios";
import { API_URL } from "../config";
import { useAuthStore } from "../store/authStore";

export const apiClient = axios.create({ baseURL: API_URL, timeout: 15000 });

// A bare instance for the one call that must never carry a (possibly
// stale) access token or trigger the 401 interceptor below: the refresh
// call itself.
const rawClient = axios.create({ baseURL: API_URL, timeout: 15000 });

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = rawClient
      .post("/auth/refresh", { refreshToken })
      .then(async (res) => {
        const { accessToken, refreshToken: newRefreshToken, user } = res.data;
        await useAuthStore.getState().setSession({ accessToken, refreshToken: newRefreshToken }, user);
        return accessToken as string;
      })
      .catch(async () => {
        await useAuthStore.getState().signOut();
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: { code?: string } }>) => {
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    const originalRequest = error.config as (typeof error.config & { _retried?: boolean }) | undefined;

    if (status === 401 && code === "INVALID_TOKEN" && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;
      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
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
