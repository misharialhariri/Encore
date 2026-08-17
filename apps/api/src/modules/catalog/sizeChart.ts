// Gulf dress sizing follows the EU numeric convention. This is the initial,
// hardcoded conversion table; Phase 7 (admin content management) makes it
// admin-editable and DB-backed without changing this shape.
export interface SizeConversion {
  gulf: string;
  eu: string;
  us: string;
  uk: string;
}

export const SIZE_CHART: SizeConversion[] = [
  { gulf: "34", eu: "34", us: "2", uk: "6" },
  { gulf: "36", eu: "36", us: "4", uk: "8" },
  { gulf: "38", eu: "38", us: "6", uk: "10" },
  { gulf: "40", eu: "40", us: "8", uk: "12" },
  { gulf: "42", eu: "42", us: "10", uk: "14" },
  { gulf: "44", eu: "44", us: "12", uk: "16" },
  { gulf: "46", eu: "46", us: "14", uk: "18" },
  { gulf: "48", eu: "48", us: "16", uk: "20" },
  { gulf: "50", eu: "50", us: "18", uk: "22" },
  { gulf: "52", eu: "52", us: "20", uk: "24" },
];

export const GULF_SIZES = SIZE_CHART.map((row) => row.gulf);

export function convertGulfSize(gulf: string): SizeConversion | undefined {
  return SIZE_CHART.find((row) => row.gulf === gulf);
}
