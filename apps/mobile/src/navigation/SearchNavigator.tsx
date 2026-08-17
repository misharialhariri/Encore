import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { SearchStackParamList } from "./types";
import { SearchScreen } from "../features/search/screens/SearchScreen";
import { ListingDetailScreen } from "../features/listings/screens/ListingDetailScreen";
import { ResellerProfileScreen } from "../features/resellers/screens/ResellerProfileScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<SearchStackParamList>();

export function SearchNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="SearchResults" component={SearchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: t("listingDetail.title") }} />
      <Stack.Screen name="ResellerProfile" component={ResellerProfileScreen} options={{ title: t("resellerProfile.title") }} />
    </Stack.Navigator>
  );
}
