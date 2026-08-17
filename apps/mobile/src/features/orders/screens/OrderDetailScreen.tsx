import React, { useCallback, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SharedListingRoutes } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TextField } from "../../../components/TextField";
import { Button } from "../../../components/Button";
import { LeaveReviewModal } from "../components/LeaveReviewModal";
import { OpenDisputeModal } from "../components/OpenDisputeModal";
import { useAuthStore } from "../../../store/authStore";
import * as ordersApi from "../../../api/orders";
import type { Order } from "../../../api/orders";
import * as reviewsApi from "../../../api/reviews";
import * as disputesApi from "../../../api/disputes";
import { extractApiErrorMessage } from "../../../api/client";
import { STATUS_KEYS, STATUS_COLORS } from "../components/OrderListView";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SharedListingRoutes, "OrderDetail">;

export function OrderDetailScreen({ route }: Props) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [order, setOrder] = useState<Order | null>(null);
  const [review, setReview] = useState<reviewsApi.Review | null>(null);
  const [dispute, setDispute] = useState<disputesApi.Dispute | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [responseBusy, setResponseBusy] = useState(false);

  const load = useCallback(() => {
    ordersApi.getOrder(route.params.orderId).then((loaded) => {
      setOrder(loaded);
      if (loaded.status === "COMPLETED") {
        reviewsApi.getReviewForOrder(loaded.id).then(setReview);
      }
      if (loaded.status === "DISPUTED") {
        disputesApi.getDisputeForOrder(loaded.id).then(setDispute);
      }
    });
  }, [route.params.orderId]);

  useFocusEffect(load);

  if (!order) return <ScreenContainer scroll={false} />;

  const isReseller = currentUserId === order.reseller.id;
  const isBuyer = currentUserId === order.buyer.id;

  async function runAction(action: () => Promise<Order>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      setOrder(updated);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not update order"));
    } finally {
      setBusy(false);
    }
  }

  async function handleShipSubmit() {
    if (!trackingNumber.trim() || !courierName.trim()) return;
    await runAction(() => ordersApi.shipOrder(order!.id, { trackingNumber: trackingNumber.trim(), courierName: courierName.trim() }));
    setShowShipForm(false);
  }

  function confirmReceiptPrompt() {
    Alert.alert(t("orders.confirmReceiptConfirm"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("orders.confirmReceiptAction"), onPress: () => void runAction(() => ordersApi.confirmReceipt(order!.id)) },
    ]);
  }

  return (
    <ScreenContainer>
      <View style={styles.listingCard}>
        {order.listing.coverImageUrl ? (
          <Image source={{ uri: order.listing.coverImageUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
        )}
        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={2}>
            {order.listing.title}
          </Text>
          <Text style={styles.totalAmount}>{order.totalAmount} SAR</Text>
        </View>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] }]}>
        <Text style={styles.statusBadgeText}>{t(STATUS_KEYS[order.status])}</Text>
      </View>

      {order.payment && (
        <Text style={styles.escrowNote}>
          {order.payment.escrowStatus === "RELEASED" ? t("orders.escrowReleased") : t("orders.escrowHeld")}
        </Text>
      )}

      <Row label={t(isBuyer ? "orders.resellerLabel" : "orders.buyerLabel")} value={(isBuyer ? order.reseller : order.buyer).displayName ?? ""} />
      <Row label={t("checkout.deliveryMethodLabel")} value={order.deliveryMethod === "SHIPPING" ? t("checkout.methodShipping") : t("checkout.methodMeetup")} />
      {order.address && <Row label={t("checkout.selectAddress")} value={`${order.address.street}, ${order.address.district}, ${order.address.city}`} />}
      {order.meetupDescription && <Row label={t("checkout.meetupDescriptionLabel")} value={order.meetupDescription} />}
      {order.trackingNumber && <Row label={t("orders.trackingLabel")} value={order.trackingNumber} />}
      {order.courierName && <Row label={t("orders.courierLabel")} value={order.courierName} />}
      {order.estimatedDeliveryDate && (
        <Row label={t("orders.estimatedDeliveryLabel")} value={new Date(order.estimatedDeliveryDate).toLocaleDateString()} />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isReseller && order.status === "PLACED" && order.payment?.status === "CAPTURED" && (
        <Button label={t("orders.confirmOrderAction")} onPress={() => runAction(() => ordersApi.confirmOrder(order.id))} loading={busy} style={styles.actionButton} />
      )}

      {isReseller && order.status === "CONFIRMED" && !showShipForm && (
        <Button label={t("orders.shipOrderAction")} onPress={() => setShowShipForm(true)} style={styles.actionButton} />
      )}

      {isReseller && order.status === "CONFIRMED" && showShipForm && (
        <View style={styles.shipForm}>
          <TextField label={t("orders.trackingNumberLabel")} value={trackingNumber} onChangeText={setTrackingNumber} />
          <TextField label={t("orders.courierNameLabel")} value={courierName} onChangeText={setCourierName} />
          <Button label={t("orders.submitShip")} onPress={handleShipSubmit} loading={busy} />
        </View>
      )}

      {isReseller && order.status === "SHIPPED" && (
        <Button label={t("orders.markDeliveredAction")} onPress={() => runAction(() => ordersApi.markDelivered(order.id))} loading={busy} style={styles.actionButton} />
      )}

      {isBuyer && (order.status === "SHIPPED" || order.status === "DELIVERED") && (
        <View style={styles.actionsRow}>
          <Button label={t("orders.confirmReceiptAction")} onPress={confirmReceiptPrompt} loading={busy} style={styles.actionButton} />
          <Button label={t("disputes.reportProblem")} variant="ghost" onPress={() => setDisputeModalOpen(true)} style={styles.actionButton} />
        </View>
      )}

      {order.status === "DISPUTED" && dispute && (
        <View style={styles.disputeCard}>
          <Text style={styles.disputeTitle}>{t("disputes.statusLabel", { status: t(`disputes.status${dispute.status}`) })}</Text>
          <Text style={styles.disputeReason}>{dispute.reason}</Text>
          <Text style={styles.disputeDescription}>{dispute.description}</Text>
          <Text style={styles.disputeDeadline}>
            {t("disputes.deadline", { date: new Date(dispute.deadlineAt).toLocaleDateString() })}
          </Text>
          {dispute.resolution ? <Text style={styles.disputeDescription}>{t("disputes.resolution", { resolution: dispute.resolution })}</Text> : null}
        </View>
      )}

      {order.status === "COMPLETED" && isBuyer && !review && (
        <Button label={t("reviews.leaveReviewAction")} onPress={() => setReviewModalOpen(true)} style={styles.actionButton} />
      )}

      {review && (
        <View style={styles.reviewCard}>
          <Text style={styles.reviewRating}>{"★".repeat(review.rating)}</Text>
          {review.comment ? <Text style={styles.disputeDescription}>{review.comment}</Text> : null}

          {review.resellerResponse ? (
            <View style={styles.reviewResponse}>
              <Text style={styles.disputeTitle}>{t("resellerProfile.resellerResponse")}</Text>
              <Text style={styles.disputeDescription}>{review.resellerResponse}</Text>
            </View>
          ) : isReseller ? (
            <View style={styles.reviewResponse}>
              <TextField
                value={responseText}
                onChangeText={setResponseText}
                placeholder={t("reviews.responsePlaceholder")}
                multiline
              />
              <Button
                label={t("reviews.submitResponse")}
                loading={responseBusy}
                disabled={!responseText.trim()}
                onPress={async () => {
                  setResponseBusy(true);
                  try {
                    const updated = await reviewsApi.respondToReview(review.id, responseText.trim());
                    setReview(updated);
                    setResponseText("");
                  } finally {
                    setResponseBusy(false);
                  }
                }}
              />
            </View>
          ) : null}
        </View>
      )}

      <LeaveReviewModal
        visible={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        orderId={order.id}
        onSubmitted={(submitted) => {
          setReview(submitted);
          setReviewModalOpen(false);
        }}
      />
      <OpenDisputeModal
        visible={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        orderId={order.id}
        onSubmitted={(opened) => {
          setDispute(opened);
          setDisputeModalOpen(false);
          load();
        }}
      />
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

const styles = StyleSheet.create({
  listingCard: { flexDirection: "row", gap: spacing.md, alignItems: "center", marginBottom: spacing.md },
  thumbnail: { width: 64, height: 64, borderRadius: radius.sm },
  thumbnailPlaceholder: { backgroundColor: colors.surfaceAlt },
  listingInfo: { flex: 1 },
  listingTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  totalAmount: { fontSize: 16, fontWeight: "800", color: colors.accent, marginTop: 2 },
  statusBadge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.sm },
  statusBadgeText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  escrowNote: { fontSize: 12, color: colors.muted, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 13, color: colors.inkSoft },
  rowValue: { fontSize: 13, color: colors.ink, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  actionButton: { marginTop: spacing.lg, marginBottom: spacing.xl },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  shipForm: { marginTop: spacing.lg, gap: spacing.sm, marginBottom: spacing.xl },
  disputeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  disputeTitle: { fontSize: 13, fontWeight: "700", color: colors.ink },
  disputeReason: { fontSize: 14, fontWeight: "600", color: colors.ink },
  disputeDescription: { fontSize: 13, color: colors.inkSoft },
  disputeDeadline: { fontSize: 12, color: colors.muted },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  reviewRating: { fontSize: 16, color: colors.warning },
  reviewResponse: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
});
