import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { getRegions, type City, type Region } from "../api/regions";
import { Button } from "./Button";
import { colors, radius, spacing } from "../theme/colors";

interface CitySelectFieldProps {
  label: string;
  placeholder: string;
  value: City | null;
  onChange: (city: City) => void;
  cancelLabel: string;
}

export function CitySelectField({ label, placeholder, value, onChange, cancelLabel }: CitySelectFieldProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getRegions()
      .then(setRegions)
      .catch(() => setRegions([]));
  }, []);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.selector} onPress={() => setOpen(true)}>
        <Text style={value ? styles.selectorValue : styles.selectorPlaceholder}>{value?.nameEn ?? placeholder}</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{placeholder}</Text>
            {regions.map((region) => (
              <View key={region.id} style={styles.regionGroup}>
                <Text style={styles.regionLabel}>{region.nameEn}</Text>
                <View style={styles.cityChips}>
                  {region.cities.map((city) => (
                    <Pressable
                      key={city.id}
                      style={[styles.chip, value?.id === city.id && styles.chipActive]}
                      onPress={() => {
                        onChange(city);
                        setOpen(false);
                      }}
                    >
                      <Text style={[styles.chipLabel, value?.id === city.id && styles.chipLabelActive]}>
                        {city.nameEn}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <Button label={cancelLabel} variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft, marginBottom: spacing.xs },
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
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipLabel: { color: colors.ink, fontSize: 14 },
  chipLabelActive: { color: colors.white, fontWeight: "600" },
});
