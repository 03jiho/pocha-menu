import { z } from "zod";

export const RESTRICTIONS = [
  "pork",
  "beef",
  "crustacean",
  "nuts",
  "egg",
  "dairy",
  "wheat",
  "fish",
  "vegan",
] as const;
export type Restriction = (typeof RESTRICTIONS)[number];

// Allergy criteria get the "Show to vendor" button on every card (cross-contamination is never knowable from a photo).
export const ALLERGY: readonly Restriction[] = ["crustacean", "nuts", "egg"];

export const ItemSchema = z.object({
  name_ko: z.string(),
  name_en: z.string(),
  likely_ingredients: z.array(z.string()),
  verdict: z.enum(["ok", "ask", "avoid"]),
  confidence: z.enum(["high", "medium", "low"]),
  reason_en: z.string(),
  triggered_restrictions: z.array(z.enum(RESTRICTIONS)),
  ask_ko: z.string(),
});

export const ResultSchema = z.object({
  readable: z.boolean(),
  items: z.array(ItemSchema),
  // General note, or why the menu could not be read when readable=false. Empty string if none.
  notes_en: z.string(),
});

export type Item = z.infer<typeof ItemSchema>;
export type AnalyzeResult = z.infer<typeof ResultSchema>;

export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const RequestSchema = z.object({
  image: z.string().min(1), // base64, no data: prefix
  mediaType: z.enum(MEDIA_TYPES),
  restrictions: z.array(z.enum(RESTRICTIONS)).min(1).max(RESTRICTIONS.length),
});
