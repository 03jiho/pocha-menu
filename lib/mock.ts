import type { AnalyzeResult } from "./schema";

export const MOCK_RESULT: AnalyzeResult = {
  readable: true,
  items: [
    {
      name_ko: "어묵",
      name_en: "Fish cake skewer",
      likely_ingredients: ["생선살", "밀가루", "멸치 육수", "무", "간장"],
      verdict: "ask",
      confidence: "medium",
      reason_en: "Usually fish paste and wheat flour in anchovy broth; some stalls add pork to the broth.",
      triggered_restrictions: ["fish", "wheat"],
      ask_ko: "육수에 돼지고기 쓰시나요?",
    },
    {
      name_ko: "순대",
      name_en: "Blood sausage",
      likely_ingredients: ["돼지 창자", "돼지 피", "당면", "찹쌀"],
      verdict: "avoid",
      confidence: "high",
      reason_en: "Made with pork intestine and pork blood.",
      triggered_restrictions: ["pork"],
      ask_ko: "이거 돼지고기 들어가나요?",
    },
    {
      name_ko: "군고구마",
      name_en: "Roasted sweet potato",
      likely_ingredients: ["고구마"],
      verdict: "ok",
      confidence: "high",
      reason_en: "Usually just sweet potato roasted over fire. Cross-contamination cannot be ruled out.",
      triggered_restrictions: [],
      ask_ko: "고구마 말고 다른 재료 들어가나요?",
    },
    {
      name_ko: "해물파전",
      name_en: "Seafood green onion pancake",
      likely_ingredients: ["밀가루", "달걀", "파", "오징어", "새우", "식용유"],
      verdict: "avoid",
      confidence: "high",
      reason_en: "Typically contains shrimp and squid in a wheat and egg batter.",
      triggered_restrictions: ["crustacean", "wheat", "egg"],
      ask_ko: "새우나 게가 들어가나요?",
    },
  ],
  notes_en: "Sample data (MOCK_MODE). Recipes vary by stall.",
};
