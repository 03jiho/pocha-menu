import type { AnalyzeResult, Lang } from "./schema";

// The model sometimes answers a Japanese user with Hangul mixed into words ("エ비") or a Chinese user in English.
// Checks the free-text fields the user actually reads (about, reason) for the right script.
const HANGUL = /[가-힣ㄱ-ㆎ]/;
const NEEDS: Record<Lang, RegExp | null> = {
  en: null,
  ja: /[぀-ヿ一-鿿]/, // kana or kanji
  zh: /[一-鿿]/, // Han
  ar: /[؀-ۿ]/, // Arabic
};

export function wrongLanguage(result: AnalyzeResult, lang: Lang) {
  const need = NEEDS[lang];
  return result.items.some((it) =>
    [it.about, it.reason].some((s) => s.trim() && (HANGUL.test(s) || (need !== null && !need.test(s)))),
  );
}
