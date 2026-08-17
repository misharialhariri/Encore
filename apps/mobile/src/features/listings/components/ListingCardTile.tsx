import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ListingCard } from "../../../api/search";
import { colors, radius, spacing } from "../../../theme/colors";

interface ListingCardTileProps {
  item: ListingCard;
  onPress: () => void;
  width?: number;
}

export function ListingCardTile({ item, onPress, width = 160 }: ListingCardTileProps) {
  return (
    <Pressable style={[styles.card, { width }]} onPress={onPress}>
      <View style={styles.imageWrap}>
        {item.coverImageUrl ? (
          <Image source={{ uri: item.coverImageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        {item.isWished && (
          <View style={styles.heartBadge}>
            <Ionicons name="heart" size={12} color={colors.white} />
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      {item.brand ? (
        <Text style={styles.brand} numberOfLines={1}>
          {item.brand.nameEn}
        </Text>
      ) : null}
      <Text style={styles.price}>{item.askingPrice} SAR</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 2 },
  imageWrap: { position: "relative" },
  image: { width: "100%", aspectRatio: 0.85, borderRadius: radius.sm },
  imagePlaceholder: { backgroundColor: colors.surfaceAlt },
  heartBadge: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 13, color: colors.ink, fontWeight: "600", marginTop: spacing.xs },
  brand: { fontSize: 11, color: colors.muted },
  price: { fontSize: 13, color: colors.accent, fontWeight: "700" },
});
