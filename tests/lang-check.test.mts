// Run: node tests/lang-check.test.mts — the wrong-language guard used before accepting a model answer.
import assert from "node:assert/strict";
import { wrongLanguage } from "../lib/lang-check.ts";

const r = (about: string, reason: string) =>
  ({ items: [{ about, reason }] }) as unknown as Parameters<typeof wrongLanguage>[0];

assert.equal(wrongLanguage(r("Roasted chestnuts.", "Chestnuts are tree nuts."), "en"), false);
assert.equal(wrongLanguage(r("焼き栗です。", "栗はナッツ類です。"), "ja"), false);
assert.equal(wrongLanguage(r("焼き栗です。", "甲殻類であるエ비が含まれます。"), "ja"), true); // Hangul leak
assert.equal(wrongLanguage(r("烤栗子。", "栗子属于坚果。"), "zh"), false);
assert.equal(wrongLanguage(r(" roasted chestnuts.", "chestnuts are nuts."), "zh"), true); // English instead of Chinese
assert.equal(wrongLanguage(r("كستناء مشوية.", "الكستناء من المكسرات."), "ar"), false);
assert.equal(wrongLanguage(r("Roasted chestnuts.", "الكستناء من المكسرات."), "ar"), true);
assert.equal(wrongLanguage(r("", ""), "ja"), false); // empty fields are not a language error
console.log("lang-check.test: ok");
