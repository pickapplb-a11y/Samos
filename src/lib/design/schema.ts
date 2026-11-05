import { z } from "zod";
import { FONT_FAMILIES, ZONE_IDS } from "./zones";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const zone = z.enum(ZONE_IDS as [string, ...string[]]);

const base = {
  id: z.string().min(1).max(40),
  zone,
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().positive().max(10000),
  height: z.number().finite().positive().max(10000),
  rotation: z.number().finite().min(-360).max(360),
  opacity: z.number().min(0).max(1).default(1),
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  name: z.string().max(60).optional(),
};

export const imageLayerSchema = z.object({
  ...base,
  type: z.literal("image"),
  assetId: z.string().min(1).max(40),
  flipX: z.boolean().default(false),
});

export const textLayerSchema = z.object({
  ...base,
  type: z.literal("text"),
  text: z.string().min(1).max(80),
  fontFamily: z.string().refine((f) => FONT_FAMILIES.includes(f), "Unsupported font"),
  fontSize: z.number().min(8).max(1000),
  color: hex,
  letterSpacing: z.number().min(-20).max(100).default(0),
  align: z.enum(["left", "center", "right"]).default("center"),
  strokeColor: hex.optional(),
  strokeWidth: z.number().min(0).max(40).default(0),
});

export const layerSchema = z.discriminatedUnion("type", [imageLayerSchema, textLayerSchema]);
export type Layer = z.infer<typeof layerSchema>;
export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type TextLayer = z.infer<typeof textLayerSchema>;

export const designInputSchema = z.object({
  name: z.string().trim().min(1).max(80).default("Untitled design"),
  style: z.enum(["OVERSIZED", "REGULAR", "ZIP"]),
  colorHex: hex,
  colorName: z.string().min(1).max(40),
  productId: z.string().max(40).nullish(),
  layers: z.array(layerSchema).max(40),
});
export type DesignInput = z.infer<typeof designInputSchema>;
