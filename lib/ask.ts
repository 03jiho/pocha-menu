// Builds the vendor question from a fixed template so the answer buttons ("네, 들어가요" / "아니요, 안 들어가요")
// always match it, whatever the model returns.

// Picks the particle form by whether the last syllable has a final consonant (받침). Non-Hangul → second form.
function josa(word: string, withBatchim: string, without: string) {
  const code = word.trim().charCodeAt(word.trim().length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? withBatchim : without;
}

// Drops items that are the dish itself ("군밤" → "밤", "새우튀김" → "새우"): asking about them is pointless.
export function askable<T extends { ko: string }>(menu: string, items: T[]) {
  const name = menu.replace(/\s/g, "");
  return items.filter((a) => {
    const w = a.ko.replace(/\s/g, "");
    return w && !name.includes(w);
  });
}

// askKo("김치찌개", ["돼지고기", "맛술"]) → "김치찌개에 돼지고기나 맛술이 들어가나요?"
// 3+ items read better as a list: "어묵에 새우, 게, 돼지고기 중 하나라도 들어가나요?"
export function askKo(menu: string, words: string[]) {
  const w = words.map((s) => s.trim()).filter(Boolean);
  if (!w.length) return `${menu}에 제가 못 먹는 재료가 들어가나요?`;
  if (w.length >= 3) return `${menu}에 ${w.join(", ")} 중 하나라도 들어가나요?`;
  const list = w.length === 2 ? w[0] + josa(w[0], "이나", "나") + " " + w[1] : w[0];
  return `${menu}에 ${list}${josa(w[w.length - 1], "이", "가")} 들어가나요?`;
}
