import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import * as notificationsApi from "../../../api/notifications";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "Notifications">;

export function NotificationCenterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<notificationsApi.AppNotification[]>([]);

  const load = useCallback(() => {
    notificationsApi.getNotifications().then(setNotifications);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    load();
  }

  async function handleClearAll() {
    await notificationsApi.clearAll();
    load();
  }

  async function handlePressNotification(notification: notificationsApi.AppNotification) {
    if (!notification.isRead) {
      await notificationsApi.markOneRead(notification.id);
      load();
    }
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.actionsRow}>
        <Pressable onPress={() => navigation.navigate("NotificationPreferences")} style={styles.actionButton}>
          <Ionicons name="settings-outline" size={16} color={colors.accent} />
          <Text style={styles.actionText}>{t("notifications.preferencesTitle")}</Text>
        </Pressable>
        <Pressable onPress={handleMarkAllRead} style={styles.actionButton}>
          <Text style={styles.actionText}>{t("notifications.markAllRead")}</Text>
        </Pressable>
        <Pressable onPress={handleClearAll} style={styles.actionButton}>
          <Text style={styles.actionText}>{t("notifications.clearAll")}</Text>
        </Pressable>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t("notifications.empty")}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => handlePressNotification(item)}>
              {!item.isRead && <View style={styles.unreadDot} />}
              <View style={styles.rowContent}>
                <Text style={styles.title}>{item.payloadJson.title}</Text>
                <Text style={styles.body} numberOfLines={2}>
                  {item.payloadJson.body}
                </Text>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, flexWrap: "wrap" },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 13, fontWeight: "600", color: colors.accent },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: "center" },
  row: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm, alignItems: "flex-start" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 },
  rowContent: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700", color: colors.ink },
  body: { fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  time: { fontSize: 11, color: colors.muted, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border },
});
