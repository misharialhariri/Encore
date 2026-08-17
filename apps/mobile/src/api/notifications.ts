import { apiClient } from "./client";

export type NotificationType =
  | "NEW_MESSAGE"
  | "OFFER_RECEIVED"
  | "OFFER_ACCEPTED"
  | "OFFER_DECLINED"
  | "OFFER_COUNTERED"
  | "ORDER_STATUS_UPDATE"
  | "PRICE_DROP";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  payloadJson: { title: string; body: string; data?: Record<string, string> };
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreference {
  type: NotificationType;
  enabled: boolean;
}

export async function getNotifications(): Promise<AppNotification[]> {
  const { data } = await apiClient.get("/notifications");
  return data.notifications;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get("/notifications/unread-count");
  return data.count;
}

export async function markAllRead(): Promise<void> {
  await apiClient.post("/notifications/read-all");
}

export async function markOneRead(id: string): Promise<void> {
  await apiClient.post(`/notifications/${id}/read`);
}

export async function clearAll(): Promise<void> {
  await apiClient.delete("/notifications");
}

export async function getPreferences(): Promise<NotificationPreference[]> {
  const { data } = await apiClient.get("/notifications/preferences");
  return data.preferences;
}

export async function updatePreference(type: NotificationType, enabled: boolean): Promise<void> {
  await apiClient.put("/notifications/preferences", { type, enabled });
}
