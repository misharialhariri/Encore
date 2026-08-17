import React, { useCallback, useState } from "react";
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SellStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { Button } from "../../../components/Button";
import { useAuthStore } from "../../../store/authStore";
import * as listingsApi from "../../../api/listings";
import type { Listing, ListingStatus } from "../../../api/listings";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SellStackParamList, "Dashboard">;

const STATUS_KEYS: Record<ListingStatus, string> = {
  PENDING_REVIEW: "dashboard.statusPendingReview",
  ACTIVE: "dashboard.statusActive",
  PAUSED: "dashboard.statusPaused",
  SOLD: "dashboard.statusSold",
  REMOVED: "dashboard.statusRemoved",
};

const STATUS_COLORS: Record<ListingStatus, string> = {
  PENDING_REVIEW: colors.warning,
  ACTIVE: colors.success,
  PAUSED: colors.muted,
  SOLD: colors.accent,
  REMOVED: colors.danger,
};

export function ListingDashboardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await listingsApi.getMyListings();
      setListings(all.filter((l) => l.status !== "REMOVED"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function handleStatusChange(listing: Listing, status: ListingStatus) {
    try {
      const updated = await listingsApi.setListingStatus(listing.id, status);
      setListings((prev) =>
        status === "REMOVED" ? prev.filter((l) => l.id !== listing.id) : prev.map((l) => (l.id === updated.id ? updated : l))
      );
    } catch {
      Alert.alert("Could not update listing");
    }
  }

  function confirmMarkSold(listing: Listing) {
    Alert.alert(t("dashboard.confirmMarkSold"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("dashboard.actionMarkSold"), onPress: () => void handleStatusChange(listing, "SOLD") },
    ]);
  }

  function confirmDelete(listing: Listing) {
    Alert.alert(t("dashboard.confirmDelete"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("dashboard.actionDelete"), style: "destructive", onPress: () => void handleStatusChange(listing, "REMOVED") },
    ]);
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("dashboard.title")}</Text>
        <Button label={t("dashboard.newListing")} onPress={() => navigation.navigate("ListingForm")} />
      </View>
      {userId && (
        <Button
          label={t("dashboard.viewProfile")}
          variant="ghost"
          onPress={() => navigation.navigate("ResellerProfile", { resellerId: userId })}
        />
      )}

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t("dashboard.empty")}</Text>
              <Button label={t("dashboard.emptyAction")} onPress={() => navigation.navigate("ListingForm")} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable style={styles.cardRow} onPress={() => navigation.navigate("ListingPreview", { listingId: item.id })}>
              {item.images[0] ? (
                <Image source={{ uri: item.images[0].url }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardPrice}>{item.askingPrice} SAR</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                  <Text style={styles.statusBadgeText}>{t(STATUS_KEYS[item.status])}</Text>
                </View>
                <Text style={styles.stats}>
                  {t("dashboard.views", { count: item.viewsCount })} · {t("dashboard.saves", { count: item.savesCount })}
                </Text>
                {item.status === "PENDING_REVIEW" && <Text style={styles.reviewNotice}>{t("dashboard.reviewNotice")}</Text>}
              </View>
            </Pressable>

            <View style={styles.actions}>
              {(item.status === "ACTIVE" || item.status === "PAUSED") && (
                <ActionLink label={t("dashboard.actionEdit")} onPress={() => navigation.navigate("ListingForm", { listingId: item.id })} />
              )}
              {item.status === "ACTIVE" && (
                <ActionLink label={t("dashboard.actionPause")} onPress={() => void handleStatusChange(item, "PAUSED")} />
              )}
              {item.status === "PAUSED" && (
                <ActionLink label={t("dashboard.actionActivate")} onPress={() => void handleStatusChange(item, "ACTIVE")} />
              )}
              {(item.status === "ACTIVE" || item.status === "PAUSED") && (
                <>
                  <ActionLink label={t("dashboard.actionMarkSold")} onPress={() => confirmMarkSold(item)} />
                  <ActionLink
                    label={t("dashboard.actionBoost")}
                    onPress={() => Alert.alert(t("dashboard.actionBoost"), t("dashboard.boostComingSoon"))}
                  />
                  <ActionLink label={t("dashboard.actionDelete")} destructive onPress={() => confirmDelete(item)} />
                </>
              )}
            </View>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

function ActionLink({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Text style={[styles.actionLink, destructive && styles.actionLinkDestructive]} onPress={onPress}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  listContent: { paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  empty: { alignItems: "center", gap: spacing.md, marginTop: spacing.xxl },
  emptyText: { color: colors.inkSoft, fontSize: 15 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardRow: { flexDirection: "row", gap: spacing.md },
  thumbnail: { width: 72, height: 72, borderRadius: radius.sm },
  thumbnailPlaceholder: { backgroundColor: colors.surfaceAlt },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  cardPrice: { fontSize: 14, color: colors.accent, fontWeight: "700" },
  statusBadge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  statusBadgeText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  stats: { fontSize: 12, color: colors.muted },
  reviewNotice: { fontSize: 12, color: colors.warning },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm },
  actionLink: { color: colors.accent, fontSize: 13, fontWeight: "600" },
  actionLinkDestructive: { color: colors.danger },
});
