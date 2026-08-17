import React, { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { TextField } from "../../../components/TextField";
import { Button } from "../../../components/Button";
import * as offersApi from "../../../api/offers";
import { extractApiErrorMessage } from "../../../api/client";
import { colors, radius, spacing } from "../../../theme/colors";

interface MakeOfferModalProps {
  visible: boolean;
  onClose: () => void;
  listingId: string;
  askingPrice: number;
  onSent: (offerId: string) => void;
}

export function MakeOfferModal({ visible, onClose, listingId, askingPrice, onSent }: MakeOfferModalProps) {
  const { t } = useTranslation();
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const value = Number(price);
    if (!value || value <= 0) {
      setError(t("offers.offerPriceLabel"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const offer = await offersApi.createOffer(listingId, value);
      setPrice("");
      onSent(offer.id);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not send offer"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t("offers.makeOfferTitle")}</Text>
          <Text style={styles.askingPrice}>{askingPrice} SAR</Text>
          <TextField
            label={t("offers.offerPriceLabel")}
            placeholder={t("offers.offerPricePlaceholder")}
            keyboardType="number-pad"
            value={price}
            onChangeText={setPrice}
            error={error ?? undefined}
          />
          <Button label={t("offers.submitOffer")} onPress={handleSubmit} loading={submitting} style={styles.submitButton} />
          <Button label={t("common.cancel")} variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink },
  askingPrice: { fontSize: 13, color: colors.muted, marginBottom: spacing.sm },
  submitButton: { marginTop: spacing.sm },
});
