import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "./types";
import { PhoneEntryScreen } from "../features/auth/screens/PhoneEntryScreen";
import { OTPVerifyScreen } from "../features/auth/screens/OTPVerifyScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
      <Stack.Screen
        name="OtpVerify"
        component={OTPVerifyScreen}
        options={{ headerShown: true, title: "", headerBackTitle: "" }}
      />
    </Stack.Navigator>
  );
}
