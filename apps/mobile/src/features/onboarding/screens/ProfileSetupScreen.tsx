import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TextField } from "../../../components/TextField";
import { Button } from "../../../components/Button";
import { ChipGroup } from "../../../components/ChipGroup";
import { CitySelectField } from "../../../components/CitySelectField";
import { useAuthStore } from "../../../store/authStore";
import type { City } from "../../../api/regions";
import * as usersApi from "../../../api/users";
import { extractApiErrorMessage } from "../../../api/client";
import { colors, spacing } from "../../../theme/colors";

const USER_TYPES = [
  { value: "BUYER", labelKey: "onboarding.userTypeBuyer" },
  { value: "RESELLER", labelKey: "onboarding.userTypeReseller" },
  { value: "BOTH", labelKey: "onboarding.userTypeBoth" },
] as const;

export function ProfileSetupScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [selectedCity, setSelectedCity] = useState<City | null>(
    user?.city ? { id: user.city.id, nameEn: user.city.nameEn, nameAr: user.city.nameAr, regionId: "" } : null
  );
  const [userType, setUserType] = useState<"BUYER" | "RESELLER" | "BOTH" | null>(user?.userType ?? null);
  const [photoUri, setPhotoUri] = useState<string | null>(user?.profilePhotoUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
        cityId: selectedCity?.id,
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

      <CitySelectField
        label={t("onboarding.cityLabel")}
        placeholder={t("onboarding.selectCity")}
        value={selectedCity}
        onChange={setSelectedCity}
        cancelLabel={t("common.cancel")}
      />

      <Text style={styles.fieldLabel}>{t("onboarding.userTypeLabel")}</Text>
      <ChipGroup
        options={USER_TYPES.map((type) => ({ value: type.value, label: t(type.labelKey) }))}
        selected={userType ? [userType] : []}
        onChange={([value]) => setUserType((value as typeof userType) ?? null)}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label={t("onboarding.finish")} onPress={handleFinish} loading={saving} style={styles.finishButton} />
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
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.inkSoft, marginBottom: spacing.xs },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.md, marginBottom: spacing.sm },
  finishButton: { marginTop: spacing.md, marginBottom: spacing.xl },
});
