import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import type { ProfileStackParamList } from "./types";
import { ProfileScreen } from "../features/profile/screens/ProfileScreen";
import { WishlistScreen } from "../features/wishlist/screens/WishlistScreen";
import { ListingDetailScreen } from "../features/listings/screens/ListingDetailScreen";
import { ResellerProfileScreen } from "../features/resellers/screens/ResellerProfileScreen";
import { OfferThreadScreen } from "../features/offers/screens/OfferThreadScreen";
import { MyOffersScreen } from "../features/offers/screens/MyOffersScreen";
import { CheckoutScreen } from "../features/checkout/screens/CheckoutScreen";
import { OrderConfirmationScreen } from "../features/checkout/screens/OrderConfirmationScreen";
import { OrderDetailScreen } from "../features/orders/screens/OrderDetailScreen";
import { MyOrdersScreen } from "../features/orders/screens/MyOrdersScreen";
import { ConversationScreen } from "../features/chat/screens/ConversationScreen";
import { NotificationCenterScreen } from "../features/notifications/screens/NotificationCenterScreen";
import { NotificationPreferencesScreen } from "../features/notifications/screens/NotificationPreferencesScreen";
import { VerificationScreen } from "../features/verification/screens/VerificationScreen";
import { colors } from "../theme/colors";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ title: t("wishlist.title") }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: t("listingDetail.title") }} />
      <Stack.Screen name="ResellerProfile" component={ResellerProfileScreen} options={{ title: t("resellerProfile.title") }} />
      <Stack.Screen name="OfferThread" component={OfferThreadScreen} options={{ title: t("offers.threadTitle") }} />
      <Stack.Screen name="MyOffers" component={MyOffersScreen} options={{ title: t("offers.myOffersTitle") }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: t("checkout.title") }} />
      <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: t("orders.orderDetailTitle") }} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: t("orders.myOrdersTitle") }} />
      <Stack.Screen name="Conversation" component={ConversationScreen} options={{ title: "" }} />
      <Stack.Screen name="Notifications" component={NotificationCenterScreen} options={{ title: t("notifications.title") }} />
      <Stack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={{ title: t("notifications.preferencesTitle") }}
      />
      <Stack.Screen name="Verification" component={VerificationScreen} options={{ title: t("verification.title") }} />
    </Stack.Navigator>
  );
}
