import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { ChipGroup } from "../../../components/ChipGroup";
import { TextField } from "../../../components/TextField";
import { Button } from "../../../components/Button";
import * as disputesApi from "../../../api/disputes";
import type { Dispute } from "../../../api/disputes";
import { extractApiErrorMessage } from "../../../api/client";
import { colors, radius, spacing } from "../../../theme/colors";

const REASONS = [
  "disputes.reasonNotAsDescribed",
  "disputes.reasonDamaged",
  "disputes.reasonNotReceived",
  "disputes.reasonWrongItem",
  "disputes.reasonOther",
] as const;

interface OpenDisputeModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  onSubmitted: (dispute: Dispute) => void;
}

export function OpenDisputeModal({ visible, onClose, orderId, onSubmitted }: OpenDisputeModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddPhoto() {
    if (photos.length >= 6) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const contentType = asset.mimeType?.includes("png") ? "image/png" : asset.mimeType?.includes("webp") ? "image/webp" : "image/jpeg";
      const { uploadUrl, publicUrl } = await disputesApi.getEvidenceUploadUrl(contentType);
      await disputesApi.uploadEvidencePhoto(uploadUrl, asset.uri, contentType);
      setPhotos((prev) => [...prev, publicUrl]);
    } catch {
      setError(t("disputes.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!reason || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const dispute = await disputesApi.openDispute(orderId, t(reason), description.trim(), photos);
      onSubmitted(dispute);
      setReason(null);
      setDescription("");
      setPhotos([]);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not open dispute"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t("disputes.openTitle")}</Text>
          <Text style={styles.label}>{t("disputes.reasonLabel")}</Text>
          <ChipGroup
            options={REASONS.map((key) => ({ value: key, label: t(key) }))}
            selected={reason ? [reason] : []}
            onChange={([v]) => setReason(v ?? null)}
          />
          <TextField
            value={description}
            onChangeText={setDescription}
            placeholder={t("disputes.descriptionPlaceholder")}
            multiline
            numberOfLines={3}
            style={styles.textArea}
          />
          <Text style={styles.label}>{t("disputes.evidenceLabel")}</Text>
          <View style={styles.photoRow}>
            {photos.map((url) => (
              <Image key={url} source={{ uri: url }} style={styles.photoTile} />
            ))}
            {photos.length < 6 && (
              <Pressable style={[styles.photoTile, styles.addTile]} onPress={handleAddPhoto} disabled={uploading}>
                {uploading ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="camera-outline" size={20} color={colors.muted} />}
              </Pressable>
            )}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t("disputes.submit")} onPress={handleSubmit} loading={submitting} disabled={!reason || !description.trim()} />
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
    maxHeight: "85%",
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink },
  label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft },
  textArea: { minHeight: 70, textAlignVertical: "top", paddingTop: spacing.sm },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photoTile: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  addTile: { borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger, fontSize: 12 },
});
