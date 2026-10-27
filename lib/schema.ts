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

// Allergy criteria: every card says "Always confirm with the vendor" (cross-contamination is never knowable from a photo).
export const ALLERGY: readonly Restriction[] = ["crustacean", "nuts", "egg"];

export const LANGS = ["en", "ja", "zh", "ar"] as const;
export type Lang = (typeof LANGS)[number];

export const MODES = ["menu", "label"] as const;
export type Mode = (typeof MODES)[number];

export const VERDICTS = ["ok", "ask", "avoid"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const ItemSchema = z.object({
  name_ko: z.string(),
  name: z.string(), // in the user's language
  likely_ingredients: z.array(z.string()), // Korean
  flagged_ingredients: z.array(z.string()), // subset of likely_ingredients that hit a selected restriction
  verdict: z.enum(VERDICTS),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string(), // in the user's language
  triggered_restrictions: z.array(z.enum(RESTRICTIONS)),
  ask_ko: z.string(), // always Korean, shown to the vendor
});

export const ResultSchema = z.object({
  readable: z.boolean(),
  items: z.array(ItemSchema),
  ask_all_ko: z.string(), // one Korean question covering the whole menu
  notes: z.string(), // general note, or why it was unreadable; "" if none
  label_contains: z.string(), // label mode: allergen statement as printed ("…함유"); "" otherwise
  label_facility: z.string(), // label mode: shared-facility statement as printed; "" otherwise
});

export type Item = z.infer<typeof ItemSchema>;
export type AnalyzeResult = z.infer<typeof ResultSchema>;

export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const RequestSchema = z.object({
  image: z.string().min(1), // base64, no data: prefix
  mediaType: z.enum(MEDIA_TYPES),
  restrictions: z.array(z.enum(RESTRICTIONS)).min(1).max(RESTRICTIONS.length),
  lang: z.enum(LANGS).default("en"),
  mode: z.enum(MODES).default("menu"),
});
