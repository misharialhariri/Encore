import React from "react";
import { StyleSheet, Text } from "react-native";
import { ScreenContainer } from "./ScreenContainer";
import { colors, spacing } from "../theme/colors";

export function ComingSoon({ title, message }: { title: string; message: string }) {
  return (
    <ScreenContainer scroll={false}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginTop: spacing.lg },
  message: { fontSize: 14, color: colors.inkSoft, marginTop: spacing.sm },
});
