export type Style = "OVERSIZED" | "REGULAR" | "ZIP";
export type ZoneId = "front" | "back" | "leftSleeve" | "rightSleeve";

/** Logical editor units per inch. Print export renders at PRINT_DPI. */
export const UNITS_PER_INCH = 100;
export const PRINT_DPI = 300;

export interface ZoneSpec {
  id: ZoneId;
  label: string;
  /** Printable area in inches (DTG/DTF platen-safe). */
  widthIn: number;
  heightIn: number;
}

const SLEEVE = (id: ZoneId, label: string): ZoneSpec => ({ id, label, widthIn: 3.5, heightIn: 14 });

export const ZONES: Record<Style, Record<ZoneId, ZoneSpec>> = {
  OVERSIZED: {
    front: { id: "front", label: "Front", widthIn: 12, heightIn: 14 },
    back: { id: "back", label: "Back", widthIn: 14, heightIn: 16 },
    leftSleeve: SLEEVE("leftSleeve", "Left sleeve"),
    rightSleeve: SLEEVE("rightSleeve", "Right sleeve"),
  },
  REGULAR: {
    front: { id: "front", label: "Front", widthIn: 11, heightIn: 12 },
    back: { id: "back", label: "Back", widthIn: 12, heightIn: 14 },
    leftSleeve: SLEEVE("leftSleeve", "Left sleeve"),
    rightSleeve: SLEEVE("rightSleeve", "Right sleeve"),
  },
  // The zipper splits the front panel, so zip-ups print a left-chest badge only.
  ZIP: {
    front: { id: "front", label: "Left chest", widthIn: 4.5, heightIn: 4.5 },
    back: { id: "back", label: "Back", widthIn: 12, heightIn: 14 },
    leftSleeve: SLEEVE("leftSleeve", "Left sleeve"),
    rightSleeve: SLEEVE("rightSleeve", "Right sleeve"),
  },
};

export const ZONE_IDS: ZoneId[] = ["front", "back", "leftSleeve", "rightSleeve"];

export function zoneUnits(style: Style, zone: ZoneId) {
  const z = ZONES[style][zone];
  return { w: z.widthIn * UNITS_PER_INCH, h: z.heightIn * UNITS_PER_INCH };
}

export const STYLE_LABELS: Record<Style, string> = {
  OVERSIZED: "Oversized",
  REGULAR: "Regular fit",
  ZIP: "Zip-up",
};

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"] as const;
export type Size = (typeof SIZES)[number];

export const STUDIO_COLORS = [
  { name: "Jet Black", hex: "#111111" },
  { name: "Bone", hex: "#E9E3D5" },
  { name: "Heather Grey", hex: "#9A9A9A" },
  { name: "Charcoal", hex: "#3A3A3C" },
  { name: "Navy", hex: "#1C2440" },
  { name: "Forest", hex: "#24382B" },
  { name: "Burgundy", hex: "#5A1F2B" },
  { name: "Blaze", hex: "#FF6B00" },
  { name: "Sand", hex: "#C8B597" },
  { name: "Sky", hex: "#9DB8D4" },
  { name: "Lilac", hex: "#B9A8CF" },
  { name: "Off White", hex: "#F4F2EC" },
];

export const FONTS = [
  { family: "Anton", label: "Anton" },
  { family: "Bebas Neue", label: "Bebas Neue" },
  { family: "Archivo Black", label: "Archivo Black" },
  { family: "Oswald", label: "Oswald" },
  { family: "Inter", label: "Inter" },
  { family: "Space Mono", label: "Space Mono" },
  { family: "Playfair Display", label: "Playfair" },
  { family: "Permanent Marker", label: "Marker" },
  { family: "Pacifico", label: "Pacifico" },
  { family: "UnifrakturMaguntia", label: "Blackletter" },
] as const;
export const FONT_FAMILIES = FONTS.map((f) => f.family) as string[];
