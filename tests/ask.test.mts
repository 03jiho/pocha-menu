// Run: node tests/ask.test.mts — checks the vendor question template and Korean particles.
import assert from "node:assert/strict";
import { askable, askKo, repairAskAbout } from "../lib/ask.ts";

assert.equal(askKo("김치찌개", ["돼지고기", "맛술"]), "김치찌개에 돼지고기나 맛술이 들어가나요?");
assert.equal(askKo("어묵", ["새우"]), "어묵에 새우가 들어가나요?");
assert.equal(askKo("순대", ["돼지 창자", "새우젓"]), "순대에 돼지 창자나 새우젓이 들어가나요?");
assert.equal(askKo("호떡", ["땅콩", "돼지기름", "버터"]), "호떡에 땅콩, 돼지기름, 버터 중 하나라도 들어가나요?");
assert.equal(askKo("떡볶이", ["어묵", "맛술"]), "떡볶이에 어묵이나 맛술이 들어가나요?");
assert.equal(askKo("떡볶이", ["MSG"]), "떡볶이에 MSG가 들어가나요?");
assert.equal(askKo("떡볶이", []), "떡볶이에 제가 못 먹는 재료가 들어가나요?");
assert.equal(askKo("떡볶이", [" ", "술 "]), "떡볶이에 술이 들어가나요?");

// The dish's own main ingredient is never asked about.
const ko = (xs: string[]) => xs.map((k) => ({ ko: k }));
assert.deepEqual(askable("군밤", ko(["밤"])), []);
assert.deepEqual(askable("새우튀김", ko(["새우", "달걀"])), ko(["달걀"]));
assert.deepEqual(askable("오징어 튀김", ko(["오징어"])), []);
assert.deepEqual(askable("어묵", ko(["새우", "돼지고기"])), ko(["새우", "돼지고기"]));
// ask_about.ko written in the user's language gets its Korean back from the ingredient list.
const ings = ["ニンニク (마늘)", "ピーナッツ (땅콩)"];
assert.deepEqual(repairAskAbout([{ ko: "ニンニク", local: "ニンニク" }], ings), [{ ko: "마늘", local: "ニンニク" }]);
assert.deepEqual(repairAskAbout([{ ko: "땅콩", local: "ピーナッツ" }], ings), [{ ko: "땅콩", local: "ピーナッツ" }]);
assert.deepEqual(repairAskAbout([{ ko: "料理酒", local: "料理酒" }], ings), []); // no Korean to recover → dropped
console.log("ask.test: ok");
