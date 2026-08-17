import { prisma } from "../config/prisma";
import { sendPushToUser } from "./push";

export const NotificationType = {
  NEW_MESSAGE: "NEW_MESSAGE",
  OFFER_RECEIVED: "OFFER_RECEIVED",
  OFFER_ACCEPTED: "OFFER_ACCEPTED",
  OFFER_DECLINED: "OFFER_DECLINED",
  OFFER_COUNTERED: "OFFER_COUNTERED",
  ORDER_STATUS_UPDATE: "ORDER_STATUS_UPDATE",
  PRICE_DROP: "PRICE_DROP",
  REVIEW_RECEIVED: "REVIEW_RECEIVED",
  DISPUTE_UPDATE: "DISPUTE_UPDATE",
} as const;

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];

// Every notification type a user can toggle in Settings. Kept in sync with
// NotificationType above so the preferences screen has a fixed, complete list.
export const ALL_NOTIFICATION_TYPES = Object.values(NotificationType);

export async function isNotificationEnabled(userId: string, type: string): Promise<boolean> {
  const pref = await prisma.notificationPreference.findUnique({ where: { userId_type: { userId, type } } });
  return pref?.enabled ?? true;
}

export interface NotifyPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Central entry point for every notification in the app: writes the
 * in-app Notification row (source of truth for the notification center)
 * and fires a best-effort push. Skips both if the user has this type
 * turned off in their preferences.
 */
export async function notify(userId: string, type: NotificationTypeValue, payload: NotifyPayload) {
  const enabled = await isNotificationEnabled(userId, type);
  if (!enabled) return null;

  const notification = await prisma.notification.create({
    data: { userId, type, payloadJson: { title: payload.title, body: payload.body, data: payload.data ?? {} }, isRead: false },
  });

  void sendPushToUser(userId, payload).catch((err) => console.error(`Push send failed for user ${userId}:`, err));

  return notification;
}
