import React, { useEffect, useState } from "react";
import { Alert, FlatList, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SharedListingRoutes } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { Button } from "../../../components/Button";
import { ReportListingModal } from "../components/ReportListingModal";
import { useAuthStore } from "../../../store/authStore";
import * as listingsApi from "../../../api/listings";
import * as catalogApi from "../../../api/catalog";
import * as wishlistApi from "../../../api/wishlist";
import type { Listing } from "../../../api/listings";
import type { ListingCard } from "../../../api/search";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SharedListingRoutes, "ListingDetail">;

export function ListingDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [listing, setListing] = useState<Listing | null>(null);
  const [sizeChart, setSizeChart] = useState<catalogApi.SizeConversion[]>([]);
  const [isWished, setIsWished] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    listingsApi.getListing(route.params.listingId).then((l) => {
      setListing(l);
      setIsWished(l.isWished ?? false);
    });
    catalogApi.getListingMeta().then((meta) => setSizeChart(meta.sizeChart));
  }, [route.params.listingId]);

  if (!listing) return <ScreenContainer scroll={false} />;

  const isOwner = currentUserId === listing.reseller.id;
  const sizeRow = sizeChart.find((row) => row.gulf === listing.sizeGulf);

  async function toggleWishlist() {
    if (wishBusy) return;
    setWishBusy(true);
    const next = !isWished;
    setIsWished(next);
    try {
      if (next) await wishlistApi.addToWishlist(listing!.id);
      else await wishlistApi.removeFromWishlist(listing!.id);
    } catch {
      setIsWished(!next);
    } finally {
      setWishBusy(false);
    }
  }

  async function handleShare() {
    try {
      await Share.share({ message: `${listing!.title} — ${listing!.askingPrice} SAR on Encore` });
    } catch {
      // user cancelled or share sheet failed silently — nothing to recover
    }
  }

  function comingSoon(feature: string) {
    Alert.alert(feature, t("listingDetail.comingSoon"));
  }

  return (
    <ScreenContainer>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
        {listing.images.map((img) => (
          <Image key={img.id} source={{ uri: img.url }} style={styles.galleryImage} />
        ))}
      </ScrollView>

      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{listing.title}</Text>
          {listing.brand ? <Text style={styles.brand}>{listing.brand.nameEn}</Text> : null}
        </View>
        {!isOwner && (
          <Pressable onPress={toggleWishlist} style={styles.wishButton} disabled={wishBusy}>
            <Ionicons name={isWished ? "heart" : "heart-outline"} size={26} color={isWished ? colors.accent : colors.muted} />
          </Pressable>
        )}
      </View>

      {isOwner && <Text style={styles.ownerNotice}>{t("listingDetail.yourListing")}</Text>}

      <View style={styles.priceRow}>
        <Text style={styles.askingPrice}>{listing.askingPrice} SAR</Text>
        <Text style={styles.originalPrice}>{listing.originalPrice} SAR</Text>
      </View>

      {sizeRow && (
        <Text style={styles.sizeLine}>
          {t("listingDetail.sizeConversion", { gulf: sizeRow.gulf, eu: sizeRow.eu, us: sizeRow.us, uk: sizeRow.uk })}
        </Text>
      )}

      <View style={styles.tagsRow}>
        {listing.colors.map((c) => (
          <Tag key={c} label={c} />
        ))}
        {listing.styleTags.map((tag) => (
          <Tag key={tag.id} label={tag.nameEn} />
        ))}
      </View>

      <Row label={t("listingDetail.condition")} value={listing.condition.replace(/_/g, " ")} />
      <Row label={t("listingDetail.fabric")} value={listing.fabricType} />
      <Row label={t("listingDetail.pickup")} value={`${listing.pickupCity.nameEn}, ${listing.pickupDistrict}`} />
      <Row
        label={listing.shippingAvailable ? t("listingDetail.shippingAvailable") : t("listingDetail.shippingNotAvailable")}
        value={listing.acceptsOffers ? t("listingDetail.acceptsOffers") : ""}
      />

      <Text style={styles.description}>{listing.description}</Text>

      <Text style={styles.stats}>
        {listing.viewsCount} {t("listingDetail.views")} · {listing.savesCount} {t("listingDetail.saves")}
      </Text>

      <Pressable
        style={styles.resellerCard}
        onPress={() => navigation.navigate("ResellerProfile", { resellerId: listing.reseller.id })}
      >
        {listing.reseller.profilePhotoUrl ? (
          <Image source={{ uri: listing.reseller.profilePhotoUrl }} style={styles.resellerAvatar} />
        ) : (
          <View style={[styles.resellerAvatar, styles.resellerAvatarPlaceholder]} />
        )}
        <View style={styles.resellerInfo}>
          <Text style={styles.resellerName}>{listing.reseller.displayName ?? t("resellerProfile.title")}</Text>
          {listing.reseller.city ? <Text style={styles.resellerCity}>{listing.reseller.city.nameEn}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      {!isOwner && (
        <View style={styles.actionsRow}>
          <Button label={t("listingDetail.share")} variant="secondary" onPress={handleShare} style={styles.actionButton} />
          <Button label={t("listingDetail.report")} variant="secondary" onPress={() => setReportOpen(true)} style={styles.actionButton} />
        </View>
      )}

      {!isOwner && (
        <View style={styles.buyRow}>
          <Button
            label={t("listingDetail.buyNow")}
            onPress={() => comingSoon(t("listingDetail.buyNow"))}
            style={styles.buyButton}
          />
          {listing.acceptsOffers && (
            <Button
              label={t("listingDetail.makeOffer")}
              variant="secondary"
              onPress={() => comingSoon(t("listingDetail.makeOffer"))}
              style={styles.buyButton}
            />
          )}
        </View>
      )}

      {!isOwner && (
        <Button
          label={t("listingDetail.chatWithReseller")}
          variant="ghost"
          onPress={() => comingSoon(t("listingDetail.chatWithReseller"))}
        />
      )}

      {listing.similarItems && listing.similarItems.length > 0 && (
        <View style={styles.similarSection}>
          <Text style={styles.similarTitle}>{t("listingDetail.similarItems")}</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={listing.similarItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.similarList}
            renderItem={({ item }) => <SimilarCard item={item} onPress={() => navigation.push("ListingDetail", { listingId: item.id })} />}
          />
        </View>
      )}

      <ReportListingModal visible={reportOpen} onClose={() => setReportOpen(false)} listingId={listing.id} />
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagLabel}>{label}</Text>
    </View>
  );
}

function SimilarCard({ item, onPress }: { item: ListingCard; onPress: () => void }) {
  return (
    <Pressable style={styles.similarCard} onPress={onPress}>
      {item.coverImageUrl ? (
        <Image source={{ uri: item.coverImageUrl }} style={styles.similarImage} />
      ) : (
        <View style={[styles.similarImage, styles.similarImagePlaceholder]} />
      )}
      <Text style={styles.similarCardTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.similarCardPrice}>{item.askingPrice} SAR</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gallery: { height: 320, borderRadius: radius.md, marginBottom: spacing.md },
  galleryImage: { width: 343, height: 320, borderRadius: radius.md },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  titleBlock: { flex: 1 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  brand: { fontSize: 14, color: colors.inkSoft, marginTop: 2 },
  wishButton: { padding: spacing.xs },
  ownerNotice: { fontSize: 12, color: colors.accent, fontWeight: "600", marginTop: spacing.xs },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.sm },
  askingPrice: { fontSize: 22, fontWeight: "800", color: colors.accent },
  originalPrice: { fontSize: 14, color: colors.muted, textDecorationLine: "line-through" },
  sizeLine: { fontSize: 13, color: colors.inkSoft, marginTop: spacing.xs },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  tag: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  tagLabel: { fontSize: 12, color: colors.ink },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 13, color: colors.inkSoft },
  rowValue: { fontSize: 13, color: colors.ink, fontWeight: "600" },
  description: { fontSize: 14, color: colors.ink, marginTop: spacing.md, lineHeight: 21 },
  stats: { fontSize: 12, color: colors.muted, marginTop: spacing.md },
  resellerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resellerAvatar: { width: 40, height: 40, borderRadius: 20 },
  resellerAvatarPlaceholder: { backgroundColor: colors.surfaceAlt },
  resellerInfo: { flex: 1 },
  resellerName: { fontSize: 14, fontWeight: "600", color: colors.ink },
  resellerCity: { fontSize: 12, color: colors.muted },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  actionButton: { flex: 1 },
  buyRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  buyButton: { flex: 1 },
  similarSection: { marginTop: spacing.lg, marginBottom: spacing.xl },
  similarTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  similarList: { gap: spacing.md },
  similarCard: { width: 130 },
  similarImage: { width: 130, height: 130, borderRadius: radius.sm },
  similarImagePlaceholder: { backgroundColor: colors.surfaceAlt },
  similarCardTitle: { fontSize: 12, color: colors.ink, marginTop: spacing.xs },
  similarCardPrice: { fontSize: 12, color: colors.accent, fontWeight: "700" },
});
