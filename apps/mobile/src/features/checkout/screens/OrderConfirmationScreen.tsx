import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SharedListingRoutes } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { Button } from "../../../components/Button";
import { colors, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SharedListingRoutes, "OrderConfirmation">;

export function OrderConfirmationScreen({ route, navigation }: Props) {
  const { t } = useTranslation();

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={40} color={colors.white} />
        </View>
        <Text style={styles.title}>{t("orderConfirmation.title")}</Text>
        <Text style={styles.message}>{t("orderConfirmation.message")}</Text>
        <Button
          label={t("orderConfirmation.viewOrder")}
          onPress={() => navigation.replace("OrderDetail", { orderId: route.params.orderId })}
          style={styles.button}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  message: { fontSize: 14, color: colors.inkSoft, textAlign: "center", lineHeight: 21 },
  button: { minWidth: 220, marginTop: spacing.md },
});
