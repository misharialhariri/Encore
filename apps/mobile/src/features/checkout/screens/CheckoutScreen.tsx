import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { WebView } from "react-native-webview";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SharedListingRoutes } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TextField } from "../../../components/TextField";
import { Button } from "../../../components/Button";
import { ChipGroup } from "../../../components/ChipGroup";
import { AddressSelector } from "../components/AddressSelector";
import { MeetupMapPicker } from "../components/MeetupMapPicker";
import * as listingsApi from "../../../api/listings";
import * as ordersApi from "../../../api/orders";
import type { Address } from "../../../api/addresses";
import { extractApiErrorMessage } from "../../../api/client";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<SharedListingRoutes, "Checkout">;

export function CheckoutScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const [listing, setListing] = useState<listingsApi.Listing | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"SHIPPING" | "MEETUP">("MEETUP");
  const [address, setAddress] = useState<Address | null>(null);
  const [meetupCoords, setMeetupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [meetupDescription, setMeetupDescription] = useState("");

  const [order, setOrder] = useState<ordersApi.Order | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    listingsApi.getListing(route.params.listingId).then((l) => {
      setListing(l);
      setDeliveryMethod(l.shippingAvailable ? "SHIPPING" : "MEETUP");
    });
  }, [route.params.listingId]);

  if (!listing) return <ScreenContainer scroll={false} />;

  async function handlePlaceOrder() {
    if (deliveryMethod === "SHIPPING" && !address) {
      setError(t("checkout.selectAddress"));
      return;
    }
    if (deliveryMethod === "MEETUP" && !meetupCoords) {
      setError(t("checkout.meetupInstructions"));
      return;
    }

    setPlacing(true);
    setError(null);
    try {
      const created = await ordersApi.createOrder({
        listingId: listing!.id,
        offerId: route.params.offerId,
        deliveryMethod,
        addressId: deliveryMethod === "SHIPPING" ? address?.id : undefined,
        meetupLat: deliveryMethod === "MEETUP" ? meetupCoords?.latitude : undefined,
        meetupLng: deliveryMethod === "MEETUP" ? meetupCoords?.longitude : undefined,
        meetupDescription: deliveryMethod === "MEETUP" ? meetupDescription.trim() || undefined : undefined,
      });
      setOrder(created);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not place order"));
    } finally {
      setPlacing(false);
    }
  }

  async function handlePay() {
    if (!order) return;
    setError(null);
    try {
      const result = await ordersApi.checkout(order.id);
      setDevMode(result.devMode);
      if (result.checkoutUrl) {
        setCheckoutUrl(result.checkoutUrl);
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not start payment"));
    }
  }

  async function handleDevSimulate() {
    if (!order) return;
    setVerifying(true);
    try {
      await ordersApi.devSimulatePayment(order.id);
      navigation.replace("OrderConfirmation", { orderId: order.id });
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not simulate payment"));
    } finally {
      setVerifying(false);
    }
  }

  async function handleWebViewNavigation(url: string) {
    if (!order || !url.includes("/payment-callback")) return;
    setCheckoutUrl(null);
    setVerifying(true);
    try {
      const result = await ordersApi.refreshPaymentStatus(order.id);
      if (result.applied) {
        navigation.replace("OrderConfirmation", { orderId: order.id });
      } else {
        setError(t("checkout.paymentPendingNotice"));
      }
    } finally {
      setVerifying(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>{t("checkout.title")}</Text>
      <Text style={styles.listingTitle}>{listing.title}</Text>

      {!order && (
        <>
          <Text style={styles.fieldLabel}>{t("checkout.deliveryMethodLabel")}</Text>
          <ChipGroup
            options={[
              ...(listing.shippingAvailable ? [{ value: "SHIPPING", label: t("checkout.methodShipping") }] : []),
              { value: "MEETUP", label: t("checkout.methodMeetup") },
            ]}
            selected={[deliveryMethod]}
            onChange={([v]) => v && setDeliveryMethod(v as "SHIPPING" | "MEETUP")}
          />

          {deliveryMethod === "SHIPPING" && (
            <View style={styles.section}>
              <AddressSelector value={address} onChange={setAddress} />
            </View>
          )}

          {deliveryMethod === "MEETUP" && (
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>{t("checkout.meetupInstructions")}</Text>
              <MeetupMapPicker value={meetupCoords} onChange={setMeetupCoords} />
              <TextField
                label={t("checkout.meetupDescriptionLabel")}
                placeholder={t("checkout.meetupDescriptionPlaceholder")}
                value={meetupDescription}
                onChangeText={setMeetupDescription}
                style={styles.meetupNotes}
              />
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label={t("checkout.placeOrder")} onPress={handlePlaceOrder} loading={placing} style={styles.submitButton} />
        </>
      )}

      {order && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{t("checkout.summaryTitle")}</Text>
          <SummaryRow label={t("checkout.itemPrice")} value={order.itemPrice} />
          {order.shippingFee > 0 && <SummaryRow label={t("checkout.shippingFee")} value={order.shippingFee} />}
          <SummaryRow label={t("checkout.platformFee")} value={order.platformFee} />
          <View style={styles.divider} />
          <SummaryRow label={t("checkout.total")} value={order.totalAmount} bold />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {verifying ? (
            <ActivityIndicator style={styles.loader} color={colors.accent} />
          ) : devMode ? (
            <View style={styles.devBox}>
              <Text style={styles.devNotice}>{t("checkout.devSimulateNotice")}</Text>
              <Button label={t("checkout.devSimulateButton")} onPress={handleDevSimulate} style={styles.submitButton} />
            </View>
          ) : checkoutUrl ? null : (
            <Button label={t("checkout.payNow")} onPress={handlePay} style={styles.submitButton} />
          )}
        </View>
      )}

      <Modal visible={Boolean(checkoutUrl)} animationType="slide">
        {checkoutUrl && (
          <WebView
            source={{ uri: checkoutUrl }}
            onNavigationStateChange={(state) => void handleWebViewNavigation(state.url)}
            style={styles.webview}
          />
        )}
      </Modal>
    </ScreenContainer>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryLabelBold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>{value} SAR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, marginTop: spacing.sm },
  listingTitle: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.lg },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.inkSoft, marginBottom: spacing.xs, marginTop: spacing.md },
  section: { marginTop: spacing.sm },
  meetupNotes: { marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.md },
  submitButton: { marginTop: spacing.lg, marginBottom: spacing.xl },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  summaryTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  summaryLabel: { fontSize: 14, color: colors.inkSoft },
  summaryLabelBold: { fontWeight: "700", color: colors.ink },
  summaryValue: { fontSize: 14, color: colors.ink },
  summaryValueBold: { fontWeight: "700", color: colors.accent, fontSize: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  devBox: { marginTop: spacing.sm },
  devNotice: { fontSize: 12, color: colors.muted, marginTop: spacing.md },
  loader: { marginTop: spacing.lg },
  webview: { flex: 1, marginTop: 40 },
});
