import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors, radius, spacing } from "../theme/colors";

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  prefix?: string;
}

export function TextField({ label, error, prefix, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, error && styles.inputRowError]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.muted}
          style={[styles.input, style]}
          {...inputProps}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  label: { fontSize: 13, fontWeight: "600", color: colors.inkSoft, marginBottom: spacing.xs },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  inputRowError: { borderColor: colors.danger },
  prefix: { fontSize: 16, color: colors.inkSoft, marginEnd: spacing.xs },
  input: { flex: 1, minHeight: 52, fontSize: 16, color: colors.ink },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
});
