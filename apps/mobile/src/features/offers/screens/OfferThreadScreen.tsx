import React, { useCallback, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SharedListingRoutes } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TextField } from "../../../components/TextField";
import { Button } from "../../../components/Button";
import { useAuthStore } from "../../../store/authStore";
import * as offersApi from "../../../api/offers";
import type { OfferDetail, OfferStatus } from "../../../api/offers";
import { extractApiErrorMessage } from "../../../api/client";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SharedListingRoutes, "OfferThread">;

const STATUS_KEYS: Record<OfferStatus, string> = {
  PENDING: "offers.statusPending",
  ACCEPTED: "offers.statusAccepted",
  DECLINED: "offers.statusDeclined",
  COUNTERED: "offers.statusCountered",
  EXPIRED: "offers.statusExpired",
};

const STATUS_COLORS: Record<OfferStatus, string> = {
  PENDING: colors.warning,
  ACCEPTED: colors.success,
  DECLINED: colors.danger,
  COUNTERED: colors.muted,
  EXPIRED: colors.muted,
};

export function OfferThreadScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    offersApi.getOffer(route.params.offerId).then(setOffer);
  }, [route.params.offerId]);

  useFocusEffect(load);

  if (!offer) return <ScreenContainer scroll={false} />;

  const isBuyer = currentUserId === offer.buyerId;

  async function runAction(action: () => Promise<offersApi.Offer>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      setOffer((prev) => (prev ? { ...prev, ...updated } : prev));
      load();
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not update offer"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCounterSubmit() {
    const value = Number(counterPrice);
    if (!value || value <= 0) return;
    await runAction(() => offersApi.counterOffer(offer!.id, value));
    setShowCounterInput(false);
    setCounterPrice("");
  }

  return (
    <ScreenContainer>
      <View style={styles.listingCard}>
        {offer.listing.coverImageUrl ? (
          <Image source={{ uri: offer.listing.coverImageUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
        )}
        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={1}>
            {offer.listing.title}
          </Text>
          <Text style={styles.listingAskingPrice}>{t("listingForm.askingPriceLabel")}: {offer.listing.askingPrice} SAR</Text>
        </View>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[offer.status] }]}>
        <Text style={styles.statusBadgeText}>{t(STATUS_KEYS[offer.status])}</Text>
      </View>

      <Text style={styles.historyLabel}>{t("offers.historyLabel")}</Text>
      {offer.history.map((entry, index) => {
        const authoredByBuyer = index % 2 === 0;
        return (
          <View key={entry.id} style={styles.historyRow}>
            <Text style={styles.historyAuthor}>{authoredByBuyer ? t("orders.buyerLabel") : t("orders.resellerLabel")}</Text>
            <Text style={styles.historyPrice}>{entry.offerPrice} SAR</Text>
          </View>
        );
      })}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {offer.status === "PENDING" && offer.isMyTurn && !showCounterInput && (
        <View style={styles.actionsRow}>
          <Button label={t("offers.accept")} onPress={() => runAction(() => offersApi.acceptOffer(offer.id))} loading={busy} style={styles.actionButton} />
          <Button
            label={t("offers.decline")}
            variant="secondary"
            onPress={() => runAction(() => offersApi.declineOffer(offer.id))}
            loading={busy}
            style={styles.actionButton}
          />
          <Button label={t("offers.counter")} variant="ghost" onPress={() => setShowCounterInput(true)} style={styles.actionButton} />
        </View>
      )}

      {offer.status === "PENDING" && offer.isMyTurn && showCounterInput && (
        <View style={styles.counterForm}>
          <TextField
            label={t("offers.counterPriceLabel")}
            keyboardType="number-pad"
            value={counterPrice}
            onChangeText={setCounterPrice}
          />
          <Button label={t("offers.submitCounter")} onPress={handleCounterSubmit} loading={busy} />
          <Button label={t("common.cancel")} variant="ghost" onPress={() => setShowCounterInput(false)} />
        </View>
      )}

      {offer.status === "PENDING" && !offer.isMyTurn && <Text style={styles.waiting}>{t("offers.waitingForReply")}</Text>}

      {offer.status === "ACCEPTED" && isBuyer && (
        <Button
          label={t("offers.proceedToCheckout")}
          onPress={() => navigation.navigate("Checkout", { listingId: offer.listing.id, offerId: offer.id })}
          style={styles.checkoutButton}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listingCard: { flexDirection: "row", gap: spacing.md, alignItems: "center", marginBottom: spacing.md },
  thumbnail: { width: 56, height: 56, borderRadius: radius.sm },
  thumbnailPlaceholder: { backgroundColor: colors.surfaceAlt },
  listingInfo: { flex: 1 },
  listingTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  listingAskingPrice: { fontSize: 12, color: colors.muted, marginTop: 2 },
  statusBadge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.lg },
  statusBadgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  historyLabel: { fontSize: 13, fontWeight: "600", color: colors.inkSoft, marginBottom: spacing.sm },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyAuthor: { fontSize: 13, color: colors.inkSoft },
  historyPrice: { fontSize: 14, fontWeight: "700", color: colors.ink },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  actionButton: { flex: 1 },
  counterForm: { marginTop: spacing.lg, gap: spacing.sm },
  waiting: { fontSize: 13, color: colors.muted, marginTop: spacing.lg, textAlign: "center" },
  checkoutButton: { marginTop: spacing.lg, marginBottom: spacing.xl },
});
