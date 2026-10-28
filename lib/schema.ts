import { z } from "zod";

// Shown in groups on the first screen; order here is display order.
export const DIETS = ["halal", "vegetarian", "vegan", "pork", "beef"] as const;
export const ALLERGIES = ["crustacean", "mollusk", "fish", "egg", "dairy", "wheat", "nuts", "soy", "sesame"] as const;
// Rarer items from Korea's mandatory allergen labeling list; collapsed under "More" so the first screen still fits.
export const MORE_ALLERGIES = ["buckwheat", "peach", "tomato", "sulfites"] as const;
// "other" = the user's own free-text restriction (never a chip; added when the text box is filled).
export const RESTRICTIONS = [...DIETS, ...ALLERGIES, ...MORE_ALLERGIES, "other"] as const;
export type Restriction = (typeof RESTRICTIONS)[number];

// Allergy criteria: every card says "Always confirm with the vendor" (cross-contamination is never knowable from a photo).
export const ALLERGY: readonly Restriction[] = [...ALLERGIES, ...MORE_ALLERGIES];

export const OTHER_MAX = 60;

export const LANGS = ["en", "ja", "zh", "ar"] as const;
export type Lang = (typeof LANGS)[number];

export const MODES = ["menu", "label"] as const;
export type Mode = (typeof MODES)[number];

export const VERDICTS = ["ok", "ask", "avoid"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const ItemSchema = z.object({
  name_ko: z.string(),
  name: z.string(), // in the user's language
  about: z.string(), // one short sentence in the user's language: what this dish is
  likely_ingredients: z.array(z.string()), // "user-language (한국어)", e.g. "egg (달걀)"
  flagged_ingredients: z.array(z.string()), // exact subset of likely_ingredients that hit a selected restriction
  verdict: z.enum(VERDICTS),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string(), // in the user's language
  triggered_restrictions: z.array(z.enum(RESTRICTIONS)),
  // What to ask the vendor about. The app builds the question from a fixed template ("X에 A나 B가 들어가나요?")
  // so "네" always means "it contains it" — the model never writes the question itself.
  ask_about: z.array(z.object({ ko: z.string(), local: z.string() })),
});

export const ResultSchema = z.object({
  readable: z.boolean(),
  items: z.array(ItemSchema),
  ask_all_ko: z.string(), // one Korean question covering the whole menu
  ask_all: z.string(), // the same question in the user's language
  other_ko: z.string(), // the user's free-text restriction as a short polite Korean sentence; "" if none
  notes: z.string(), // general note, or why it was unreadable; "" if none
  label_contains: z.string(), // label mode: allergen statement as printed ("…함유"); "" otherwise
  label_facility: z.string(), // label mode: shared-facility statement as printed; "" otherwise
});

// Sent to Gemini as responseJsonSchema ($schema is not in its supported keyword list).
export const RESULT_JSON_SCHEMA: Record<string, unknown> = z.toJSONSchema(ResultSchema);
delete RESULT_JSON_SCHEMA.$schema;

export type Item = z.infer<typeof ItemSchema>;
export type AnalyzeResult = z.infer<typeof ResultSchema>;

export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const RequestSchema = z.object({
  image: z.string().min(1), // base64, no data: prefix
  mediaType: z.enum(MEDIA_TYPES),
  restrictions: z.array(z.enum(RESTRICTIONS)).min(1).max(RESTRICTIONS.length),
  other: z.string().trim().max(OTHER_MAX).default(""),
  lang: z.enum(LANGS).default("en"),
  mode: z.enum(MODES).default("menu"),
});
