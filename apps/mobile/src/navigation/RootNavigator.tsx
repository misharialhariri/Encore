import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useAuthStore } from "../store/authStore";
import { getMe } from "../api/users";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { BiometricUnlockScreen } from "../features/auth/screens/BiometricUnlockScreen";
import { ProfileSetupScreen } from "../features/onboarding/screens/ProfileSetupScreen";
import { colors } from "../theme/colors";

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

export function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const validateSession = useAuthStore((s) => s.validateSession);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status === "validating") {
      void validateSession(getMe);
    }
  }, [status, validateSession]);

  return (
    <NavigationContainer>
      {(() => {
        switch (status) {
          case "hydrating":
          case "validating":
            return <SplashScreen />;
          case "locked":
            return <BiometricUnlockScreen />;
          case "signedOut":
            return <AuthNavigator />;
          case "signedIn":
            return user?.needsProfileSetup ? <ProfileSetupScreen /> : <MainNavigator />;
          default:
            return <SplashScreen />;
        }
      })()}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
});
