import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as devicesApi from "../api/devices";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let registeredToken: string | null = null;

// Registers this device with the backend's FCM-based push service. Best-effort:
// permission denial, simulators, and any registration failure are swallowed so a
// push setup problem never blocks the app from being usable.
export async function registerForPushNotificationsAsync(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return;

    const token = await Notifications.getDevicePushTokenAsync();
    const platform = token.type === "ios" ? "IOS" : token.type === "android" ? "ANDROID" : null;
    if (!platform) return;

    registeredToken = token.data;
    await devicesApi.registerDevice(token.data, platform);
  } catch {
    // Push registration is best-effort — the app remains fully usable without it.
  }
}

export async function unregisterCurrentDevice(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  try {
    await devicesApi.unregisterDevice(token);
  } catch {
    // Best-effort cleanup on sign-out.
  }
}
