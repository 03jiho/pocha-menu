import type { AnalyzeResult, Lang } from "./schema";

// The model sometimes answers a Japanese user with Hangul mixed into words ("エ비") or a Chinese user in English.
// Sentences (about, reason) must be in the user's script; short labels (name, ingredient names, question words)
// just must not contain Hangul — Korean belongs only in name_ko and inside the ingredient parentheses.
const HANGUL = /[가-힣ㄱ-ㆎ]/;
const NEEDS: Record<Lang, RegExp | null> = {
  en: null,
  ja: /[぀-ヿ一-鿿]/, // kana or kanji
  zh: /[一-鿿]/, // Han
  ar: /[؀-ۿ]/, // Arabic
};
const beforeParens = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "");

export function wrongLanguage(result: AnalyzeResult, lang: Lang) {
  const need = NEEDS[lang];
  return result.items.some((it) => {
    const sentences = [it.about, it.reason].filter((s) => s.trim());
    const labels = [it.name, ...it.likely_ingredients.map(beforeParens), ...it.ask_about.map((a) => a.local)];
    return (
      sentences.some((s) => HANGUL.test(s) || (need !== null && !need.test(s))) ||
      labels.some((s) => HANGUL.test(beforeParens(s)))
    );
  });
}
