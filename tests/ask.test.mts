// Run: node tests/ask.test.mts — checks the vendor question template and Korean particles.
import assert from "node:assert/strict";
import { askKo } from "../lib/ask.ts";

assert.equal(askKo("김치찌개", ["돼지고기", "맛술"]), "김치찌개에 돼지고기나 맛술이 들어가나요?");
assert.equal(askKo("어묵", ["새우"]), "어묵에 새우가 들어가나요?");
assert.equal(askKo("순대", ["돼지 창자", "새우젓"]), "순대에 돼지 창자나 새우젓이 들어가나요?");
assert.equal(askKo("호떡", ["땅콩", "돼지기름", "버터"]), "호떡에 땅콩, 돼지기름, 버터 중 하나라도 들어가나요?");
assert.equal(askKo("떡볶이", ["어묵", "맛술"]), "떡볶이에 어묵이나 맛술이 들어가나요?");
assert.equal(askKo("떡볶이", ["MSG"]), "떡볶이에 MSG가 들어가나요?");
assert.equal(askKo("떡볶이", []), "떡볶이에 위에 적은 재료가 들어가나요?");
assert.equal(askKo("떡볶이", [" ", "술 "]), "떡볶이에 술이 들어가나요?");
console.log("ask.test: ok");
