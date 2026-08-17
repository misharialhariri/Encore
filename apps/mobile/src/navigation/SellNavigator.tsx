import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { SellStackParamList } from "./types";
import { ListingDashboardScreen } from "../features/listings/screens/ListingDashboardScreen";
import { ListingFormScreen } from "../features/listings/screens/ListingFormScreen";
import { ListingDetailScreen } from "../features/listings/screens/ListingDetailScreen";
import { ResellerProfileScreen } from "../features/resellers/screens/ResellerProfileScreen";
import { OfferThreadScreen } from "../features/offers/screens/OfferThreadScreen";
import { OffersReceivedScreen } from "../features/offers/screens/OffersReceivedScreen";
import { CheckoutScreen } from "../features/checkout/screens/CheckoutScreen";
import { OrderConfirmationScreen } from "../features/checkout/screens/OrderConfirmationScreen";
import { OrderDetailScreen } from "../features/orders/screens/OrderDetailScreen";
import { SalesScreen } from "../features/orders/screens/SalesScreen";
import { PayoutsScreen } from "../features/payouts/screens/PayoutsScreen";
import { ConversationScreen } from "../features/chat/screens/ConversationScreen";
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
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: t("listingDetail.title") }} />
      <Stack.Screen name="ResellerProfile" component={ResellerProfileScreen} options={{ title: t("resellerProfile.title") }} />
      <Stack.Screen name="OfferThread" component={OfferThreadScreen} options={{ title: t("offers.threadTitle") }} />
      <Stack.Screen name="OffersReceived" component={OffersReceivedScreen} options={{ title: t("offers.receivedOffersTitle") }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: t("checkout.title") }} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: t("orders.orderDetailTitle") }} />
      <Stack.Screen name="Sales" component={SalesScreen} options={{ title: t("orders.salesTitle") }} />
      <Stack.Screen name="Payouts" component={PayoutsScreen} options={{ title: t("payouts.title") }} />
      <Stack.Screen name="Conversation" component={ConversationScreen} options={{ title: "" }} />
    </Stack.Navigator>
  );
}
