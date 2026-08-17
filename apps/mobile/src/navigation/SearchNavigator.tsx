import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { SearchStackParamList } from "./types";
import { SearchScreen } from "../features/search/screens/SearchScreen";
import { ListingDetailScreen } from "../features/listings/screens/ListingDetailScreen";
import { ResellerProfileScreen } from "../features/resellers/screens/ResellerProfileScreen";
import { OfferThreadScreen } from "../features/offers/screens/OfferThreadScreen";
import { CheckoutScreen } from "../features/checkout/screens/CheckoutScreen";
import { OrderConfirmationScreen } from "../features/checkout/screens/OrderConfirmationScreen";
import { OrderDetailScreen } from "../features/orders/screens/OrderDetailScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<SearchStackParamList>();

export function SearchNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="SearchResults" component={SearchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: t("listingDetail.title") }} />
      <Stack.Screen name="ResellerProfile" component={ResellerProfileScreen} options={{ title: t("resellerProfile.title") }} />
      <Stack.Screen name="OfferThread" component={OfferThreadScreen} options={{ title: t("offers.threadTitle") }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: t("checkout.title") }} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: t("orders.orderDetailTitle") }} />
    </Stack.Navigator>
  );
}
