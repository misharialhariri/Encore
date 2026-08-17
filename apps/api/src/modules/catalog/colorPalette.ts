// Predefined color palette resellers pick from when listing a dress —
// keeps buyer-side color filtering meaningful instead of free text.
export const COLOR_PALETTE = [
  "White",
  "Ivory",
  "Champagne",
  "Blush",
  "Pink",
  "Red",
  "Burgundy",
  "Purple",
  "Lavender",
  "Blue",
  "Navy",
  "Teal",
  "Green",
  "Emerald",
  "Gold",
  "Silver",
  "Black",
  "Grey",
  "Nude",
  "Multicolor",
] as const;

export type PaletteColor = (typeof COLOR_PALETTE)[number];
