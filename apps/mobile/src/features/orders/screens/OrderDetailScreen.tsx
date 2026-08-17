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
import * as ordersApi from "../../../api/orders";
import type { Order } from "../../../api/orders";
import { extractApiErrorMessage } from "../../../api/client";
import { STATUS_KEYS, STATUS_COLORS } from "../components/OrderListView";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SharedListingRoutes, "OrderDetail">;

export function OrderDetailScreen({ route }: Props) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShipForm, setShowShipForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");

  const load = useCallback(() => {
    ordersApi.getOrder(route.params.orderId).then(setOrder);
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
        <Button label={t("orders.confirmReceiptAction")} onPress={confirmReceiptPrompt} loading={busy} style={styles.actionButton} />
      )}
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
  shipForm: { marginTop: spacing.lg, gap: spacing.sm, marginBottom: spacing.xl },
});
