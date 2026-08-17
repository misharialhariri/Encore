// Shared with the web admin panel's design language: a dusty-rose accent on
// warm neutrals, legible in both light and dark mode.
export const colors = {
  ink: "#2A1F24",
  inkSoft: "#5B4750",
  paper: "#FBF6F4",
  surface: "#FFFFFF",
  surfaceAlt: "#F4EBE8",
  accent: "#A8455B",
  accentSoft: "#E8C9CE",
  muted: "#8C7A80",
  border: "#E4D9DA",
  success: "#3F6E56",
  warning: "#96702B",
  danger: "#B3261E",
  white: "#FFFFFF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
};

export const typography = {
  display: { fontSize: 28, fontWeight: "700" as const },
  title: { fontSize: 20, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
};
