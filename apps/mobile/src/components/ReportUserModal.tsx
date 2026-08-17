import React, { useState } from "react";
import { Alert, Modal, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChipGroup } from "./ChipGroup";
import { TextField } from "./TextField";
import { Button } from "./Button";
import * as reportsApi from "../api/reports";
import type { ReportReason } from "../api/reports";
import { colors, radius, spacing } from "../theme/colors";

const REASONS: { value: ReportReason; labelKey: string }[] = [
  { value: "HARASSMENT", labelKey: "reportUser.reasonHarassment" },
  { value: "SCAM", labelKey: "reportUser.reasonScam" },
  { value: "FAKE_ACCOUNT", labelKey: "reportUser.reasonFakeAccount" },
  { value: "OTHER", labelKey: "reportUser.reasonOther" },
];

interface ReportUserModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

export function ReportUserModal({ visible, onClose, userId }: ReportUserModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason) return;
    setSubmitting(true);
    try {
      await reportsApi.reportUser(userId, reason, description.trim() || undefined);
      onClose();
      setReason(null);
      setDescription("");
      Alert.alert(t("reportUser.success"));
    } catch {
      Alert.alert("Could not submit report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t("reportUser.title")}</Text>
          <Text style={styles.label}>{t("reportUser.reasonLabel")}</Text>
          <ChipGroup
            options={REASONS.map((r) => ({ value: r.value, label: t(r.labelKey) }))}
            selected={reason ? [reason] : []}
            onChange={([v]) => setReason((v as ReportReason) ?? null)}
          />
          <TextField
            value={description}
            onChangeText={setDescription}
            placeholder={t("reportUser.descriptionPlaceholder")}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
          <Button label={t("reportUser.submit")} onPress={handleSubmit} loading={submitting} disabled={!reason} />
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
  label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft },
  textArea: { minHeight: 70, textAlignVertical: "top", paddingTop: spacing.sm },
});
