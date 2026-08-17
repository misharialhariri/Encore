import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { MainTabParamList } from "./types";
import { HomeNavigator } from "./HomeNavigator";
import { SearchNavigator } from "./SearchNavigator";
import { SellNavigator } from "./SellNavigator";
import { ChatNavigator } from "./ChatNavigator";
import { ProfileNavigator } from "./ProfileNavigator";
import { colors } from "../theme/colors";
import { registerForPushNotificationsAsync } from "../utils/pushNotifications";

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "home-outline",
  Search: "search-outline",
  Sell: "add-circle-outline",
  Chat: "chatbubble-ellipses-outline",
  Profile: "person-outline",
};

export function MainNavigator() {
  const { t } = useTranslation();

  useEffect(() => {
    void registerForPushNotificationsAsync();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name as keyof MainTabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} options={{ title: t("home.title") }} />
      <Tab.Screen name="Search" component={SearchNavigator} options={{ title: t("search.title") }} />
      <Tab.Screen name="Sell" component={SellNavigator} options={{ title: t("sell.title") }} />
      <Tab.Screen name="Chat" component={ChatNavigator} options={{ title: t("chat.title") }} />
      <Tab.Screen name="Profile" component={ProfileNavigator} options={{ title: t("profile.title") }} />
    </Tab.Navigator>
  );
}
