import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { SellStackParamList } from "./types";
import { ListingDashboardScreen } from "../features/listings/screens/ListingDashboardScreen";
import { ListingFormScreen } from "../features/listings/screens/ListingFormScreen";
import { ListingPreviewScreen } from "../features/listings/screens/ListingPreviewScreen";
import { ResellerProfileScreen } from "../features/resellers/screens/ResellerProfileScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<SellStackParamList>();

export function SellNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="Dashboard" component={ListingDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ListingForm"
        component={ListingFormScreen}
        options={({ route }) => ({ title: route.params?.listingId ? t("listingForm.editTitle") : t("listingForm.createTitle") })}
      />
      <Stack.Screen name="ListingPreview" component={ListingPreviewScreen} options={{ title: t("listingPreview.title") }} />
      <Stack.Screen name="ResellerProfile" component={ResellerProfileScreen} options={{ title: t("resellerProfile.title") }} />
    </Stack.Navigator>
  );
}
