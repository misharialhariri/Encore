import { apiClient } from "./client";

export type DevicePlatform = "IOS" | "ANDROID";

export async function registerDevice(pushToken: string, platform: DevicePlatform): Promise<void> {
  await apiClient.post("/devices", { pushToken, platform });
}

export async function unregisterDevice(pushToken: string): Promise<void> {
  await apiClient.delete(`/devices/${encodeURIComponent(pushToken)}`);
}
