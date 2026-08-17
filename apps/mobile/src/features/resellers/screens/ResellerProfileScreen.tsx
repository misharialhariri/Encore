import React, { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SellStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import * as resellersApi from "../../../api/resellers";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SellStackParamList, "ResellerProfile">;

export function ResellerProfileScreen({ route }: Props) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<resellersApi.ResellerProfile | null>(null);

  useEffect(() => {
    resellersApi.getResellerProfile(route.params.resellerId).then(setProfile);
  }, [route.params.resellerId]);

  if (!profile) return <ScreenContainer scroll={false} />;

  const memberSince = new Date(profile.memberSince).toLocaleDateString(undefined, { year: "numeric", month: "long" });

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        {profile.profilePhotoUrl ? (
          <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{(profile.displayName ?? "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile.displayName}</Text>
          {profile.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>{t("resellerProfile.verified")}</Text>
            </View>
          )}
        </View>
        {profile.city ? <Text style={styles.city}>{profile.city.nameEn}</Text> : null}
        <Text style={styles.memberSince}>{t("resellerProfile.memberSince", { date: memberSince })}</Text>

        <View style={styles.statsRow}>
          <Text style={styles.stat}>{t("resellerProfile.totalSold", { count: profile.totalSold })}</Text>
          <Text style={styles.statDivider}>·</Text>
          <Text style={styles.stat}>
            {profile.averageRating != null
              ? t("resellerProfile.rating", { rating: profile.averageRating.toFixed(1), count: profile.reviewCount })
              : t("resellerProfile.noRatingYet")}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t("resellerProfile.activeListings")}</Text>
      <FlatList
        data={profile.activeListings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={<Text style={styles.empty}>{t("resellerProfile.noActiveListings")}</Text>}
        renderItem={({ item }) => (
          <View style={styles.listingCard}>
            {item.coverImageUrl ? (
              <Image source={{ uri: item.coverImageUrl }} style={styles.listingImage} />
            ) : (
              <View style={[styles.listingImage, styles.listingImagePlaceholder]} />
            )}
            <Text style={styles.listingTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.listingPrice}>{item.askingPrice} SAR</Text>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginVertical: spacing.lg },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: { backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 32, fontWeight: "700", color: colors.accent },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  name: { fontSize: 20, fontWeight: "700", color: colors.ink },
  verifiedBadge: { backgroundColor: colors.success, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  verifiedBadgeText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  city: { fontSize: 14, color: colors.inkSoft, marginTop: spacing.xs },
  memberSince: { fontSize: 12, color: colors.muted, marginTop: 2 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  stat: { fontSize: 13, color: colors.ink },
  statDivider: { color: colors.muted },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  gridContent: { paddingBottom: spacing.xl },
  gridRow: { gap: spacing.sm },
  empty: { color: colors.muted, fontSize: 13 },
  listingCard: { flex: 1, marginBottom: spacing.md },
  listingImage: { width: "100%", aspectRatio: 1, borderRadius: radius.sm },
  listingImagePlaceholder: { backgroundColor: colors.surfaceAlt },
  listingTitle: { fontSize: 13, color: colors.ink, marginTop: spacing.xs },
  listingPrice: { fontSize: 13, color: colors.accent, fontWeight: "700" },
});
