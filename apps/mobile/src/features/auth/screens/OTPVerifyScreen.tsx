import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { Button } from "../../../components/Button";
import { OtpCodeInput } from "../components/OtpCodeInput";
import * as authApi from "../../../api/auth";
import { extractApiErrorMessage } from "../../../api/client";
import { useAuthStore } from "../../../store/authStore";
import { colors, spacing } from "../../../theme/colors";
import { formatSaudiPhoneForDisplay } from "../../../utils/phone";

type Props = NativeStackScreenProps<AuthStackParamList, "OtpVerify">;

const OTP_TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 30;

export function OTPVerifyScreen({ route }: Props) {
  const { phoneNumber } = route.params;
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const submittedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (code.length === 6 && !submittedRef.current) {
      submittedRef.current = true;
      void handleVerify(code);
    }
    if (code.length < 6) {
      submittedRef.current = false;
    }
  }, [code]);

  async function handleVerify(candidate: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.verifyOtp(phoneNumber, candidate);
      await setSession({ accessToken: result.accessToken, refreshToken: result.refreshToken }, result.user);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Invalid code"));
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      await authApi.requestOtp(phoneNumber);
      setSecondsLeft(OTP_TTL_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setCode("");
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not resend code"));
    } finally {
      setResending(false);
    }
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const expired = secondsLeft === 0;

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.title}>{t("auth.otpTitle")}</Text>
        <Text style={styles.subtitle}>
          {t("auth.otpSubtitle", { phone: formatSaudiPhoneForDisplay(phoneNumber) })}
        </Text>
      </View>

      <OtpCodeInput value={code} onChange={setCode} error={Boolean(error)} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.timer}>
        {expired
          ? t("auth.otpExpired")
          : t("auth.otpExpiresIn", { minutes: String(minutes).padStart(2, "0"), seconds: String(seconds).padStart(2, "0") })}
      </Text>

      <Button
        label={resendCooldown > 0 ? t("auth.resendIn", { seconds: resendCooldown }) : t("common.resend")}
        variant="ghost"
        loading={resending}
        disabled={resendCooldown > 0}
        onPress={handleResend}
      />

      {loading && !error ? <Text style={styles.verifying}>{t("auth.verify")}…</Text> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.xl, marginBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: colors.inkSoft, lineHeight: 22 },
  error: { color: colors.danger, marginTop: spacing.md, fontSize: 13 },
  timer: { textAlign: "center", color: colors.muted, marginTop: spacing.lg, fontSize: 13 },
  verifying: { textAlign: "center", color: colors.accent, marginTop: spacing.sm },
});
