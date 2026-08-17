import React, { useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "../../../theme/colors";

const CODE_LENGTH = 6;

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export function OtpCodeInput({ value, onChange, error }: OtpCodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.split("");

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.wrapper}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, CODE_LENGTH))}
        keyboardType="number-pad"
        maxLength={CODE_LENGTH}
        autoFocus
        style={styles.hiddenInput}
        textContentType="oneTimeCode"
        accessibilityLabel="OTP code"
      />
      <View style={styles.boxRow}>
        {Array.from({ length: CODE_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.box,
              error && styles.boxError,
              i === digits.length && styles.boxActive,
            ]}
          >
            <Text style={styles.digit}>{digits[i] ?? ""}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: "100%" },
  hiddenInput: { position: "absolute", opacity: 0, height: 1, width: 1 },
  boxRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  box: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: { borderColor: colors.accent },
  boxError: { borderColor: colors.danger },
  digit: { fontSize: 22, fontWeight: "700", color: colors.ink },
});
