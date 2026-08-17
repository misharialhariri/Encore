import React, { useEffect, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TextField } from "../../../components/TextField";
import { Button } from "../../../components/Button";
import { useAuthStore } from "../../../store/authStore";
import { getRegions, type Region } from "../../../api/regions";
import * as usersApi from "../../../api/users";
import { extractApiErrorMessage } from "../../../api/client";
import { colors, radius, spacing } from "../../../theme/colors";

const USER_TYPES = [
  { value: "BUYER" as const, labelKey: "onboarding.userTypeBuyer" },
  { value: "RESELLER" as const, labelKey: "onboarding.userTypeReseller" },
  { value: "BOTH" as const, labelKey: "onboarding.userTypeBoth" },
];

export function ProfileSetupScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [regions, setRegions] = useState<Region[]>([]);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [selectedCityId, setSelectedCityId] = useState<string | null>(user?.city?.id ?? null);
  const [userType, setUserType] = useState<"BUYER" | "RESELLER" | "BOTH" | null>(user?.userType ?? null);
  const [photoUri, setPhotoUri] = useState<string | null>(user?.profilePhotoUrl ?? null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    getRegions()
      .then(setRegions)
      .catch(() => setError("Could not load regions"));
  }, []);

  const selectedCity = regions.flatMap((r) => r.cities).find((c) => c.id === selectedCityId) ?? null;

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadingPhoto(true);
    setError(null);
    try {
      const contentType = asset.mimeType?.includes("png")
        ? "image/png"
        : asset.mimeType?.includes("webp")
          ? "image/webp"
          : "image/jpeg";
      const { uploadUrl, publicUrl } = await usersApi.getProfilePhotoUploadUrl(contentType);
      await usersApi.uploadProfilePhoto(uploadUrl, asset.uri, contentType);
      setPhotoUri(publicUrl);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not upload photo"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleFinish() {
    if (displayName.trim().length < 2) {
      setError(t("onboarding.displayNamePlaceholder"));
      return;
    }
    if (!userType) {
      setError(t("onboarding.userTypeLabel"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await usersApi.updateMe({
        displayName: displayName.trim(),
        cityId: selectedCityId ?? undefined,
        userType,
        profilePhotoUrl: photoUri && photoUri.startsWith("http") ? photoUri : undefined,
      });
      updateUser(updated);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not save profile"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>{t("onboarding.title")}</Text>
      <Text style={styles.subtitle}>{t("onboarding.subtitle")}</Text>

      <Pressable style={styles.photoPicker} onPress={handlePickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <Text style={styles.photoPlaceholder}>{uploadingPhoto ? "…" : t("onboarding.addPhoto")}</Text>
        )}
      </Pressable>

      <TextField
        label={t("onboarding.displayNameLabel")}
        placeholder={t("onboarding.displayNamePlaceholder")}
        value={displayName}
        onChangeText={setDisplayName}
      />

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("onboarding.cityLabel")}</Text>
        <Pressable style={styles.selector} onPress={() => setCityPickerOpen(true)}>
          <Text style={selectedCity ? styles.selectorValue : styles.selectorPlaceholder}>
            {selectedCity?.nameEn ?? t("onboarding.selectCity")}
          </Text>
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{t("onboarding.userTypeLabel")}</Text>
        <View style={styles.typeRow}>
          {USER_TYPES.map((type) => (
            <Pressable
              key={type.value}
              style={[styles.typeChip, userType === type.value && styles.typeChipActive]}
              onPress={() => setUserType(type.value)}
            >
              <Text style={[styles.typeChipLabel, userType === type.value && styles.typeChipLabelActive]}>
                {t(type.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label={t("onboarding.finish")} onPress={handleFinish} loading={saving} style={styles.finishButton} />

      <Modal visible={cityPickerOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t("onboarding.selectCity")}</Text>
            {regions.map((region) => (
              <View key={region.id} style={styles.regionGroup}>
                <Text style={styles.regionLabel}>{region.nameEn}</Text>
                <View style={styles.cityChips}>
                  {region.cities.map((city) => (
                    <Pressable
                      key={city.id}
                      style={[styles.typeChip, selectedCityId === city.id && styles.typeChipActive]}
                      onPress={() => {
                        setSelectedCityId(city.id);
                        setCityPickerOpen(false);
                      }}
                    >
                      <Text style={[styles.typeChipLabel, selectedCityId === city.id && styles.typeChipLabelActive]}>
                        {city.nameEn}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <Button label={t("common.cancel")} variant="ghost" onPress={() => setCityPickerOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginTop: spacing.md },
  subtitle: { fontSize: 14, color: colors.inkSoft, marginBottom: spacing.lg },
  photoPicker: {
    alignSelf: "center",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  photo: { width: 96, height: 96 },
  photoPlaceholder: { fontSize: 12, color: colors.muted, textAlign: "center", paddingHorizontal: spacing.xs },
  field: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.inkSoft, marginBottom: spacing.xs },
  selector: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  selectorValue: { color: colors.ink, fontSize: 16 },
  selectorPlaceholder: { color: colors.muted, fontSize: 16 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  typeChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeChipLabel: { color: colors.ink, fontSize: 14 },
  typeChipLabelActive: { color: colors.white, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.sm },
  finishButton: { marginTop: spacing.md, marginBottom: spacing.xl },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "75%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  regionGroup: { marginBottom: spacing.md },
  regionLabel: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: spacing.xs },
  cityChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
