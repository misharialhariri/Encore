import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TextField } from "../../../components/TextField";
import { Button } from "../../../components/Button";
import { SocialLoginButtons } from "../components/SocialLoginButtons";
import { normalizeSaudiPhone } from "../../../utils/phone";
import * as authApi from "../../../api/auth";
import { extractApiErrorMessage } from "../../../api/client";
import { colors, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "PhoneEntry">;

export function PhoneEntryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendCode() {
    const normalized = normalizeSaudiPhone(phone);
    if (!normalized) {
      setError(t("auth.invalidPhone"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.requestOtp(normalized);
      navigation.navigate("OtpVerify", { phoneNumber: normalized });
    } catch (err) {
      setError(extractApiErrorMessage(err, t("auth.invalidPhone")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.title}>{t("auth.welcomeTitle")}</Text>
        <Text style={styles.subtitle}>{t("auth.welcomeSubtitle")}</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label={t("auth.phoneLabel")}
          placeholder={t("auth.phonePlaceholder")}
          prefix="+966"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          error={error ?? undefined}
          autoComplete="tel"
          maxLength={10}
        />
        <Button label={t("auth.sendCode")} onPress={handleSendCode} loading={loading} style={styles.sendButton} />
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>{t("common.or")}</Text>
        <View style={styles.dividerLine} />
      </View>

      <SocialLoginButtons onError={setError} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.xl, marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: colors.inkSoft, lineHeight: 22 },
  form: { marginBottom: spacing.lg },
  sendButton: { marginTop: spacing.md },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: { marginHorizontal: spacing.sm, color: colors.muted, fontSize: 13 },
});
