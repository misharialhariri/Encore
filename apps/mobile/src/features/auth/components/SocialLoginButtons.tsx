import React, { useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/Button";
import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from "../../../config";
import * as authApi from "../../../api/auth";
import { useAuthStore } from "../../../store/authStore";
import { extractApiErrorMessage } from "../../../api/client";

WebBrowser.maybeCompleteAuthSession();

interface SocialLoginButtonsProps {
  onError: (message: string) => void;
}

export function SocialLoginButtons({ onError }: SocialLoginButtonsProps) {
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  const googleConfigured = Boolean(GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID);
  const [, googleResponse, promptGoogleSignIn] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
  });

  React.useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.authentication?.idToken ?? googleResponse.params?.id_token;
      if (idToken) void completeGoogleSignIn(idToken);
    }
  }, [googleResponse]);

  async function completeGoogleSignIn(idToken: string) {
    setLoading("google");
    try {
      const result = await authApi.loginWithGoogle(idToken);
      await setSession({ accessToken: result.accessToken, refreshToken: result.refreshToken }, result.user);
    } catch (err) {
      onError(extractApiErrorMessage(err, "Google sign-in failed"));
    } finally {
      setLoading(null);
    }
  }

  async function handleAppleSignIn() {
    setLoading("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("Apple did not return an identity token");

      const displayName = credential.fullName?.givenName
        ? `${credential.fullName.givenName} ${credential.fullName.familyName ?? ""}`.trim()
        : undefined;

      const result = await authApi.loginWithApple(credential.identityToken, displayName);
      await setSession({ accessToken: result.accessToken, refreshToken: result.refreshToken }, result.user);
    } catch (err: any) {
      if (err?.code === "ERR_REQUEST_CANCELED") return;
      onError(extractApiErrorMessage(err, "Apple sign-in failed"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <View style={styles.container}>
      <Button
        label={t("auth.continueWithGoogle")}
        variant="secondary"
        loading={loading === "google"}
        onPress={() => {
          if (!googleConfigured) {
            Alert.alert("Google Sign-In", "Google sign-in is not configured for this build yet.");
            return;
          }
          void promptGoogleSignIn();
        }}
      />
      {Platform.OS === "ios" && (
        <Button
          label={t("auth.continueWithApple")}
          variant="secondary"
          loading={loading === "apple"}
          onPress={handleAppleSignIn}
          style={styles.appleButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", gap: 12 },
  appleButton: { backgroundColor: "#000" },
});
