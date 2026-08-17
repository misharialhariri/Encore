import React, { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as LocalAuthentication from "expo-local-authentication";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { Button } from "../../../components/Button";
import { useAuthStore } from "../../../store/authStore";
import * as usersApi from "../../../api/users";
import * as notificationsApi from "../../../api/notifications";
import { useFocusEffect } from "@react-navigation/native";
import { applyLayoutDirection, type SupportedLanguage } from "../../../localization/i18n";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileHome">;

export function ProfileScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const signOut = useAuthStore((s) => s.signOut);
  const [busy, setBusy] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      notificationsApi.getUnreadCount().then((count) => setUnreadCount(count));
    }, [])
  );

  async function handleToggleBiometric(value: boolean) {
    if (value) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert(t("auth.enableBiometric"), "No Face ID / Touch ID is enrolled on this device.");
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: t("auth.biometricPromptTitle") });
      if (!result.success) return;
    }

    setBusy(true);
    try {
      await setBiometricEnabled(value);
      await usersApi.updateMe({ biometricEnabled: value });
    } finally {
      setBusy(false);
    }
  }

  async function handleLanguageChange(language: SupportedLanguage) {
    if (i18n.language === language) return;
    setBusy(true);
    try {
      await i18n.changeLanguage(language);
      await usersApi.updateMe({ languagePref: language });
      applyLayoutDirection(language);
      Alert.alert(t("profile.language"), "Restart the app to apply the new text direction.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        {user.profilePhotoUrl ? (
          <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{(user.displayName ?? "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{user.displayName}</Text>
        {user.city ? <Text style={styles.city}>{user.city.nameEn}</Text> : null}
        {user.createdAt ? (
          <Text style={styles.memberSince}>
            {t("profile.memberSince", {
              date: new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" }),
            })}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Pressable style={styles.row} onPress={() => navigation.navigate("Wishlist")}>
          <Text style={styles.rowLabel}>{t("wishlist.title")}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.row} onPress={() => navigation.navigate("MyOffers")}>
          <Text style={styles.rowLabel}>{t("offers.myOffersTitle")}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.row} onPress={() => navigation.navigate("MyOrders")}>
          <Text style={styles.rowLabel}>{t("orders.myOrdersTitle")}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.row} onPress={() => navigation.navigate("Notifications")}>
          <View style={styles.rowLabelWithBadge}>
            <Text style={styles.rowLabel}>{t("notifications.title")}</Text>
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        {(user.userType === "RESELLER" || user.userType === "BOTH") && !user.isVerified && (
          <>
            <View style={styles.divider} />
            <Pressable style={styles.row} onPress={() => navigation.navigate("Verification")}>
              <Text style={styles.rowLabel}>{t("verification.getVerified")}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("auth.enableBiometric")}</Text>
          <Switch value={biometricEnabled} onValueChange={handleToggleBiometric} disabled={busy} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("profile.language")}</Text>
        <View style={styles.langRow}>
          <Button
            label="العربية"
            variant={i18n.language === "ar" ? "primary" : "secondary"}
            onPress={() => handleLanguageChange("ar")}
            style={styles.langButton}
          />
          <Button
            label="English"
            variant={i18n.language === "en" ? "primary" : "secondary"}
            onPress={() => handleLanguageChange("en")}
            style={styles.langButton}
          />
        </View>
      </View>

      <Button label={t("profile.logout")} variant="secondary" onPress={() => void signOut()} style={styles.logout} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginVertical: spacing.lg },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: { backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 32, fontWeight: "700", color: colors.accent },
  name: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.sm },
  city: { fontSize: 14, color: colors.inkSoft, marginTop: spacing.xs },
  memberSince: { fontSize: 12, color: colors.muted, marginTop: 2 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: colors.inkSoft, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  rowLabel: { fontSize: 15, color: colors.ink },
  rowLabelWithBadge: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  notificationBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  notificationBadgeText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  langRow: { flexDirection: "row", gap: spacing.sm },
  langButton: { flex: 1 },
  logout: { marginTop: spacing.lg, marginBottom: spacing.xl },
});
