import React, { useCallback, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SharedListingRoutes } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { ListingCardTile } from "../../listings/components/ListingCardTile";
import * as feedApi from "../../../api/feed";
import type { HomeFeed, FeaturedReseller } from "../../../api/feed";
import type { ListingCard } from "../../../api/search";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SharedListingRoutes & { Feed: undefined }, "Feed">;

export function HomeFeedScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await feedApi.getHomeFeed();
    setFeed(data);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  function openListing(item: ListingCard) {
    navigation.navigate("ListingDetail", { listingId: item.id });
  }

  const sections: { key: string; titleKey: string; data: ListingCard[] }[] = feed
    ? [
        { key: "forYou", titleKey: "home.forYou", data: feed.forYou },
        { key: "itemsNearMe", titleKey: "home.nearMe", data: feed.itemsNearMe },
        { key: "trending", titleKey: "home.trending", data: feed.trending },
        { key: "recentlyListed", titleKey: "home.recentlyListed", data: feed.recentlyListed },
      ].filter((s) => s.data.length > 0)
    : [];

  return (
    <ScreenContainer scroll={false}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{t("home.title")}</Text>

        {feed && sections.length === 0 && <Text style={styles.empty}>{t("home.emptyFeed")}</Text>}

        {feed?.featuredResellers.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("home.featuredResellers")}</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={feed.featuredResellers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.row}
              renderItem={({ item }) => <ResellerAvatar item={item} onPress={() => navigation.navigate("ResellerProfile", { resellerId: item.id })} />}
            />
          </View>
        ) : null}

        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={styles.sectionTitle}>{t(section.titleKey)}</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={section.data}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.row}
              renderItem={({ item }) => <ListingCardTile item={item} onPress={() => openListing(item)} />}
            />
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function ResellerAvatar({ item, onPress }: { item: FeaturedReseller; onPress: () => void }) {
  return (
    <Pressable style={styles.resellerTile} onPress={onPress}>
      {item.profilePhotoUrl ? (
        <Image source={{ uri: item.profilePhotoUrl }} style={styles.resellerAvatar} />
      ) : (
        <View style={[styles.resellerAvatar, styles.resellerAvatarPlaceholder]}>
          <Text style={styles.resellerInitial}>{(item.displayName ?? "?").charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.resellerName} numberOfLines={1}>
        {item.displayName}
      </Text>
      <Text style={styles.resellerCount}>{item.activeListingsCount}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 24, fontWeight: "700", color: colors.ink, marginTop: spacing.sm, marginBottom: spacing.md },
  empty: { color: colors.muted, fontSize: 14, marginTop: spacing.xl, textAlign: "center" },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  row: { gap: spacing.md },
  resellerTile: { width: 84, alignItems: "center" },
  resellerAvatar: { width: 64, height: 64, borderRadius: 32 },
  resellerAvatarPlaceholder: { backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  resellerInitial: { fontSize: 22, fontWeight: "700", color: colors.accent },
  resellerName: { fontSize: 12, color: colors.ink, marginTop: spacing.xs, textAlign: "center" },
  resellerCount: { fontSize: 11, color: colors.muted },
});
