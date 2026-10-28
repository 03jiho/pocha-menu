// Run: node tests/lang-check.test.mts — the wrong-language guard used before accepting a model answer.
import assert from "node:assert/strict";
import { wrongLanguage } from "../lib/lang-check.ts";

type Item = { about: string; reason: string; name?: string; ings?: string[]; asks?: string[] };
const r = ({ about, reason, name = "x", ings = [], asks = [] }: Item) =>
  ({
    items: [{ about, reason, name, likely_ingredients: ings, ask_about: asks.map((local) => ({ ko: "k", local })) }],
  }) as unknown as Parameters<typeof wrongLanguage>[0];

// Sentences
assert.equal(wrongLanguage(r({ about: "Roasted chestnuts.", reason: "Chestnuts are tree nuts." }), "en"), false);
assert.equal(wrongLanguage(r({ about: "焼き栗です。", reason: "栗はナッツ類です。" }), "ja"), false);
assert.equal(wrongLanguage(r({ about: "焼き栗です。", reason: "甲殻類であるエ비が含まれます。" }), "ja"), true);
assert.equal(wrongLanguage(r({ about: "烤栗子。", reason: "栗子属于坚果。" }), "zh"), false);
assert.equal(wrongLanguage(r({ about: " roasted chestnuts.", reason: "chestnuts are nuts." }), "zh"), true);
assert.equal(wrongLanguage(r({ about: "كستناء مشوية.", reason: "الكستناء من المكسرات." }), "ar"), false);
assert.equal(wrongLanguage(r({ about: "Roasted chestnuts.", reason: "الكستناء من المكسرات." }), "ar"), true);
assert.equal(wrongLanguage(r({ about: "", reason: "" }), "ja"), false);

// Labels: Korean only inside the ingredient parentheses
const ok = { about: "焼き栗です。", reason: "栗はナッツ類です。" };
assert.equal(wrongLanguage(r({ ...ok, name: "焼き栗", ings: ["栗 (밤)", "エビ (새우)"] }), "ja"), false);
assert.equal(wrongLanguage(r({ ...ok, ings: ["에비 (새우)"] }), "ja"), true);
assert.equal(wrongLanguage(r({ ...ok, name: "タッ강정 (甘辛チキン)" }), "ja"), true);
assert.equal(wrongLanguage(r({ ...ok, asks: ["ニンニ크"] }), "ja"), true);
console.log("lang-check.test: ok");
