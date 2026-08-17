import React from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Order, OrderStatus } from "../../../api/orders";
import { colors, radius, spacing } from "../../../theme/colors";

const STATUS_KEYS: Record<OrderStatus, string> = {
  PLACED: "orders.statusPlaced",
  CONFIRMED: "orders.statusConfirmed",
  SHIPPED: "orders.statusShipped",
  DELIVERED: "orders.statusDelivered",
  COMPLETED: "orders.statusCompleted",
  CANCELLED: "orders.statusCancelled",
  DISPUTED: "orders.statusDisputed",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PLACED: colors.warning,
  CONFIRMED: colors.accent,
  SHIPPED: colors.accent,
  DELIVERED: colors.success,
  COMPLETED: colors.success,
  CANCELLED: colors.danger,
  DISPUTED: colors.danger,
};

interface OrderListViewProps {
  orders: Order[];
  onPress: (order: Order) => void;
  emptyLabel: string;
}

export function OrderListView({ orders, onPress, emptyLabel }: OrderListViewProps) {
  const { t } = useTranslation();

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      ListEmptyComponent={<Text style={styles.empty}>{emptyLabel}</Text>}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => onPress(item)}>
          {item.listing.coverImageUrl ? (
            <Image source={{ uri: item.listing.coverImageUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
          )}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {item.listing.title}
            </Text>
            <Text style={styles.price}>{item.totalAmount} SAR</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
            <Text style={styles.badgeText}>{t(STATUS_KEYS[item.status])}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  empty: { color: colors.muted, fontSize: 14, textAlign: "center", marginTop: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  thumbnail: { width: 52, height: 52, borderRadius: radius.sm },
  thumbnailPlaceholder: { backgroundColor: colors.surfaceAlt },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: "600", color: colors.ink },
  price: { fontSize: 13, color: colors.accent, fontWeight: "700" },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "700" },
});

export { STATUS_KEYS, STATUS_COLORS };
