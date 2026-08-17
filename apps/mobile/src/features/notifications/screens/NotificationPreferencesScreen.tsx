import React, { useCallback, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import * as notificationsApi from "../../../api/notifications";
import type { NotificationType } from "../../../api/notifications";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "NotificationPreferences">;

const LABEL_KEYS: Record<NotificationType, string> = {
  NEW_MESSAGE: "notifications.typeNewMessage",
  OFFER_RECEIVED: "notifications.typeOfferReceived",
  OFFER_ACCEPTED: "notifications.typeOfferAccepted",
  OFFER_DECLINED: "notifications.typeOfferDeclined",
  OFFER_COUNTERED: "notifications.typeOfferCountered",
  ORDER_STATUS_UPDATE: "notifications.typeOrderStatusUpdate",
  PRICE_DROP: "notifications.typePriceDrop",
  REVIEW_RECEIVED: "notifications.typeReviewReceived",
  DISPUTE_UPDATE: "notifications.typeDisputeUpdate",
  LISTING_MODERATED: "notifications.typeListingModerated",
  VERIFICATION_UPDATE: "notifications.typeVerificationUpdate",
  PAYOUT_UPDATE: "notifications.typePayoutUpdate",
};

export function NotificationPreferencesScreen(_props: Props) {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<notificationsApi.NotificationPreference[]>([]);
  const [busyType, setBusyType] = useState<NotificationType | null>(null);

  useFocusEffect(
    useCallback(() => {
      notificationsApi.getPreferences().then(setPreferences);
    }, [])
  );

  async function handleToggle(type: NotificationType, value: boolean) {
    setBusyType(type);
    setPreferences((prev) => prev.map((p) => (p.type === type ? { ...p, enabled: value } : p)));
    try {
      await notificationsApi.updatePreference(type, value);
    } finally {
      setBusyType(null);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.section}>
        {preferences.map((pref, index) => (
          <View key={pref.type}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t(LABEL_KEYS[pref.type])}</Text>
              <Switch value={pref.enabled} onValueChange={(v) => handleToggle(pref.type, v)} disabled={busyType === pref.type} />
            </View>
            {index < preferences.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
  rowLabel: { fontSize: 14, color: colors.ink, flex: 1, marginEnd: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border },
});
