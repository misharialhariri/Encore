import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SellStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import * as listingsApi from "../../../api/listings";
import * as catalogApi from "../../../api/catalog";
import type { Listing } from "../../../api/listings";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SellStackParamList, "ListingPreview">;

export function ListingPreviewScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const [listing, setListing] = useState<Listing | null>(null);
  const [sizeChart, setSizeChart] = useState<catalogApi.SizeConversion[]>([]);

  useEffect(() => {
    listingsApi.getListing(route.params.listingId).then(setListing);
    catalogApi.getListingMeta().then((meta) => setSizeChart(meta.sizeChart));
  }, [route.params.listingId]);

  if (!listing) return <ScreenContainer scroll={false} />;

  const sizeRow = sizeChart.find((row) => row.gulf === listing.sizeGulf);

  return (
    <ScreenContainer>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
        {listing.images.map((img) => (
          <Image key={img.id} source={{ uri: img.url }} style={styles.galleryImage} />
        ))}
      </ScrollView>

      <Text style={styles.title}>{listing.title}</Text>
      {listing.brand ? <Text style={styles.brand}>{listing.brand.nameEn}</Text> : null}

      <View style={styles.priceRow}>
        <Text style={styles.askingPrice}>{listing.askingPrice} SAR</Text>
        <Text style={styles.originalPrice}>{listing.originalPrice} SAR</Text>
      </View>

      {sizeRow && (
        <Text style={styles.sizeLine}>
          {t("listingPreview.sizeConversion", { gulf: sizeRow.gulf, eu: sizeRow.eu, us: sizeRow.us, uk: sizeRow.uk })}
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

      <Row label={t("listingPreview.condition")} value={listing.condition.replace(/_/g, " ")} />
      <Row label={t("listingPreview.fabric")} value={listing.fabricType} />
      <Row label={t("listingPreview.pickup")} value={`${listing.pickupCity.nameEn}, ${listing.pickupDistrict}`} />
      <Row
        label={listing.shippingAvailable ? t("listingPreview.shippingAvailable") : t("listingPreview.shippingNotAvailable")}
        value={listing.acceptsOffers ? t("listingPreview.acceptsOffers") : ""}
      />

      <Text style={styles.description}>{listing.description}</Text>

      <Text style={styles.stats}>
        {listing.viewsCount} {t("listingPreview.views")} · {listing.savesCount} {t("listingPreview.saves")}
      </Text>

      <Text
        style={styles.resellerLink}
        onPress={() => navigation.navigate("ResellerProfile", { resellerId: listing.reseller.id })}
      >
        {listing.reseller.displayName ?? t("resellerProfile.title")} →
      </Text>
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

const styles = StyleSheet.create({
  gallery: { height: 320, borderRadius: radius.md, marginBottom: spacing.md },
  galleryImage: { width: 343, height: 320, borderRadius: radius.md },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  brand: { fontSize: 14, color: colors.inkSoft, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.sm },
  askingPrice: { fontSize: 22, fontWeight: "800", color: colors.accent },
  originalPrice: { fontSize: 14, color: colors.muted, textDecorationLine: "line-through" },
  sizeLine: { fontSize: 13, color: colors.inkSoft, marginTop: spacing.xs },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  tag: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  tagLabel: { fontSize: 12, color: colors.ink },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 13, color: colors.inkSoft },
  rowValue: { fontSize: 13, color: colors.ink, fontWeight: "600" },
  description: { fontSize: 14, color: colors.ink, marginTop: spacing.md, lineHeight: 21 },
  stats: { fontSize: 12, color: colors.muted, marginTop: spacing.md },
  resellerLink: { fontSize: 14, color: colors.accent, fontWeight: "600", marginTop: spacing.sm, marginBottom: spacing.xl },
});
