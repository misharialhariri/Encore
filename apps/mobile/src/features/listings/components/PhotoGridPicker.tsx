import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import * as listingsApi from "../../../api/listings";
import { colors, radius, spacing } from "../../../theme/colors";

interface PhotoGridPickerProps {
  photoUrls: string[];
  onChange: (urls: string[]) => void;
  max: number;
  addLabel: string;
}

const TILE_SIZE = 88;

export function PhotoGridPicker({ photoUrls, onChange, max, addLabel }: PhotoGridPickerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (photoUrls.length >= max) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: max - photoUrls.length,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const asset of result.assets) {
        const contentType = asset.mimeType?.includes("png")
          ? "image/png"
          : asset.mimeType?.includes("webp")
            ? "image/webp"
            : "image/jpeg";
        const { uploadUrl, publicUrl } = await listingsApi.getListingPhotoUploadUrl(contentType);
        await listingsApi.uploadListingPhoto(uploadUrl, asset.uri, contentType);
        uploadedUrls.push(publicUrl);
      }
      onChange([...photoUrls, ...uploadedUrls].slice(0, max));
    } catch {
      setError("Could not upload one or more photos");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(url: string) {
    onChange(photoUrls.filter((u) => u !== url));
  }

  return (
    <View>
      <View style={styles.grid}>
        {photoUrls.map((url) => (
          <View key={url} style={styles.tile}>
            <Image source={{ uri: url }} style={styles.image} />
            <Pressable style={styles.removeButton} onPress={() => handleRemove(url)} accessibilityLabel="Remove photo">
              <Ionicons name="close" size={14} color={colors.white} />
            </Pressable>
          </View>
        ))}

        {photoUrls.length < max && (
          <Pressable style={[styles.tile, styles.addTile]} onPress={handleAdd} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={22} color={colors.muted} />
                <Text style={styles.addLabel}>{addLabel}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  image: { width: "100%", height: "100%" },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: radius.pill,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addTile: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: { fontSize: 11, color: colors.muted, marginTop: spacing.xs, textAlign: "center" },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
});
