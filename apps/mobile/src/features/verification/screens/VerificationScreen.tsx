import React, { useCallback, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "../../../navigation/types";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { Button } from "../../../components/Button";
import { uploadToPresignedUrl } from "../../../api/client";
import * as verificationApi from "../../../api/verification";
import type { VerificationDocType, VerificationRequest } from "../../../api/verification";
import { colors, radius, spacing } from "../../../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "Verification">;

const STATUS_KEYS: Record<VerificationRequest["status"], string> = {
  PENDING: "verification.statusPending",
  APPROVED: "verification.statusApproved",
  REJECTED: "verification.statusRejected",
};

export function VerificationScreen(_props: Props) {
  const { t } = useTranslation();
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [documentType, setDocumentType] = useState<VerificationDocType>("NATIONAL_ID");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      verificationApi.getMyVerificationRequest().then(setRequest);
    }, [])
  );

  async function handlePickDocument() {
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
      const { uploadUrl, publicUrl } = await verificationApi.getDocumentUploadUrl(contentType);
      await uploadToPresignedUrl(uploadUrl, asset.uri, contentType);
      setDocumentUrl(publicUrl);
    } catch {
      Alert.alert(t("verification.submitError"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!documentUrl) return;
    setSubmitting(true);
    try {
      const created = await verificationApi.submitVerificationRequest(documentUrl, documentType);
      setRequest(created);
      setDocumentUrl(null);
    } catch {
      Alert.alert(t("verification.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.subtitle}>{t("verification.subtitle")}</Text>

      {request && request.status === "APPROVED" ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>{t(STATUS_KEYS.APPROVED)}</Text>
        </View>
      ) : request && request.status === "PENDING" ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>{t(STATUS_KEYS.PENDING)}</Text>
        </View>
      ) : (
        <View style={styles.form}>
          {request?.status === "REJECTED" && <Text style={styles.rejectedNote}>{t(STATUS_KEYS.REJECTED)}</Text>}

          <Text style={styles.label}>{t("verification.documentTypeLabel")}</Text>
          <View style={styles.docTypeRow}>
            <Button
              label={t("verification.docNationalId")}
              variant={documentType === "NATIONAL_ID" ? "primary" : "secondary"}
              onPress={() => setDocumentType("NATIONAL_ID")}
              style={styles.docTypeButton}
            />
            <Button
              label={t("verification.docIqama")}
              variant={documentType === "IQAMA" ? "primary" : "secondary"}
              onPress={() => setDocumentType("IQAMA")}
              style={styles.docTypeButton}
            />
          </View>

          {documentUrl ? (
            <Image source={{ uri: documentUrl }} style={styles.preview} />
          ) : (
            <Button label={t("verification.uploadDocument")} variant="secondary" onPress={handlePickDocument} loading={uploading} />
          )}

          <Button label={t("verification.submit")} onPress={handleSubmit} loading={submitting} disabled={!documentUrl} />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.lg },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
  },
  statusText: { fontSize: 15, fontWeight: "600", color: colors.ink, textAlign: "center" },
  form: { gap: spacing.md },
  rejectedNote: { fontSize: 13, color: colors.danger },
  label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft },
  docTypeRow: { flexDirection: "row", gap: spacing.sm },
  docTypeButton: { flex: 1 },
  preview: { width: "100%", height: 200, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
});
