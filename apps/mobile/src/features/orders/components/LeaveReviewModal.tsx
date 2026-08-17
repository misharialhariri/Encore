import React, { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { TextField } from "../../../components/TextField";
import { Button } from "../../../components/Button";
import * as reviewsApi from "../../../api/reviews";
import { colors, radius, spacing } from "../../../theme/colors";

interface LeaveReviewModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  onSubmitted: (review: reviewsApi.Review) => void;
}

export function LeaveReviewModal({ visible, onClose, orderId, onSubmitted }: LeaveReviewModalProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const review = await reviewsApi.createReview(orderId, rating, comment.trim() || undefined);
      onSubmitted(review);
      setRating(0);
      setComment("");
    } catch {
      Alert.alert(t("reviews.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t("reviews.leaveReviewTitle")}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} onPress={() => setRating(value)} hitSlop={6}>
                <Ionicons
                  name={value <= rating ? "star" : "star-outline"}
                  size={32}
                  color={value <= rating ? colors.warning : colors.muted}
                />
              </Pressable>
            ))}
          </View>
          <TextField
            value={comment}
            onChangeText={setComment}
            placeholder={t("reviews.commentPlaceholder")}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
          <Button label={t("reviews.submit")} onPress={handleSubmit} loading={submitting} disabled={rating === 0} />
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
    gap: spacing.md,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink },
  starsRow: { flexDirection: "row", gap: spacing.sm, alignSelf: "center" },
  textArea: { minHeight: 70, textAlignVertical: "top", paddingTop: spacing.sm },
});
