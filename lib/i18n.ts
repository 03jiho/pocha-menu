import type { Restriction } from "./schema";

// All UI strings live here. To add a language: copy `en`, translate, add it to STRINGS.
const en = {
  title: "Pocha Menu Check",
  subtitle: "Snap a Korean street-food menu. See what's likely inside.",
  uploadHint: "Take a photo of the menu board (not the food) for best results.",
  takePhoto: "Take photo",
  chooseGallery: "Choose from gallery",
  photoReady: "Photo ready",
  changePhoto: "Change photo",
  restrictionsTitle: "What do you avoid?",
  restrictionsHint: "Select at least one.",
  analyze: "Check menu",
  analyzing: "Reading the menu and guessing ingredients…",
  privacy: "Photos are not stored.",
  disclaimer: "Reference only — not a halal/vegan/allergy certification. Recipes vary by stall.",
  verdict: { ok: "OK", ask: "ASK", avoid: "AVOID" },
  confidence: "Confidence",
  confidenceLevel: { high: "High", medium: "Medium", low: "Low" },
  likelyIngredients: "Likely ingredients",
  flagged: "Flagged",
  showVendor: "Show to vendor",
  vendorLead: "Please show this to the vendor",
  close: "Close",
  newPhoto: "Check another menu",
  retry: "Try again",
  errors: {
    unreadable: "We couldn't read the menu. Move closer and try again in better light.",
    rate_limited: "Too many requests. Please wait a minute and try again.",
    too_large: "That photo is too large. Try a different photo.",
    bad_image: "We couldn't open that image. Try a JPEG or PNG photo.",
    analysis_failed: "Something went wrong while reading the menu. Please try again.",
    network: "Network error. Check your connection and try again.",
  },
  restrictions: {
    pork: "Pork",
    beef: "Beef",
    crustacean: "Shellfish (shrimp, crab)",
    nuts: "Peanuts / tree nuts",
    egg: "Egg",
    dairy: "Dairy",
    wheat: "Wheat (gluten)",
    fish: "Fish",
    vegan: "Vegan (no animal products)",
  } satisfies Record<Restriction, string>,
};

export type Strings = typeof en;
export type ErrorCode = keyof Strings["errors"];

export const STRINGS: Record<string, Strings> = { en };
export const t = STRINGS.en;
