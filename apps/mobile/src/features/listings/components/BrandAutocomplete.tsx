import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { TextField } from "../../../components/TextField";
import * as catalogApi from "../../../api/catalog";
import { colors, radius, spacing } from "../../../theme/colors";

interface BrandAutocompleteProps {
  label: string;
  placeholder: string;
  value: { id: string; nameEn: string } | null;
  onChange: (brand: { id: string; nameEn: string } | null) => void;
}

export function BrandAutocomplete({ label, placeholder, value, onChange }: BrandAutocompleteProps) {
  const [query, setQuery] = useState(value?.nameEn ?? "");
  const [results, setResults] = useState<catalogApi.Brand[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      catalogApi
        .searchBrands(query || undefined)
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open]);

  return (
    <View>
      <TextField
        label={label}
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChangeText={(text) => {
          setQuery(text);
          onChange(null);
          setOpen(true);
        }}
      />
      {open && results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  onChange({ id: item.id, nameEn: item.nameEn });
                  setQuery(item.nameEn);
                  setOpen(false);
                }}
              >
                <Text style={styles.rowLabel}>{item.nameEn}</Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
    maxHeight: 180,
  },
  row: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  rowLabel: { fontSize: 15, color: colors.ink },
});
