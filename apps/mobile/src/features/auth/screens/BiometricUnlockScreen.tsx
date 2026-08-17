import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { Button } from "../../../components/Button";
import { useAuthStore } from "../../../store/authStore";
import { getMe } from "../../../api/users";
import { colors, spacing } from "../../../theme/colors";

export function BiometricUnlockScreen() {
  const { t } = useTranslation();
  const validateSession = useAuthStore((s) => s.validateSession);
  const signOut = useAuthStore((s) => s.signOut);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const promptUnlock = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        // No biometric enrolled on this device anymore — fall back to a
        // silent session check instead of stranding the user.
        await validateSession(getMe);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t("auth.biometricPromptTitle"),
        disableDeviceFallback: false,
      });

      if (result.success) {
        await validateSession(getMe);
      } else {
        setError(t("auth.biometricPromptTitle"));
      }
    } finally {
      setChecking(false);
    }
  }, [t, validateSession]);

  useEffect(() => {
    void promptUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.center}>
        <Text style={styles.title}>{t("auth.biometricPromptTitle")}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label={t("auth.biometricUnlock")} onPress={promptUnlock} loading={checking} style={styles.button} />
        <Button
          label={t("auth.biometricUseCodeInstead")}
          variant="ghost"
          onPress={() => void signOut()}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  error: { color: colors.danger, fontSize: 13 },
  button: { minWidth: 220 },
});
