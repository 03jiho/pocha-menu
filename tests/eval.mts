// Prompt regression check: sends the 30 menu names as text (one request per restriction) through the real
// menu prompt and compares verdicts with tests/menu-cases.json.
// Run: GEMINI_API_KEY=... npm run eval -- [restriction]   → prints a table, writes tests/eval-results.md
//
// Grading per (menu, restriction):
//   listed in "avoid" → must be avoid
//   listed in "ask"   → ask or avoid (being more cautious is fine)
//   not listed        → ok or ask (avoid = false alarm)
import { readFileSync, writeFileSync } from "node:fs";
import { GEMINI_MODEL, generateJson } from "../lib/gemini.ts";
import { SYSTEM_PROMPTS, userPrompt } from "../lib/prompt.ts";
import { RESTRICTIONS, RESULT_JSON_SCHEMA, ResultSchema, type Restriction, type Verdict } from "../lib/schema.ts";

type Case = { menu: string; avoid: Restriction[]; ask: Restriction[] };
const cases: Case[] = JSON.parse(readFileSync(new URL("./menu-cases.json", import.meta.url), "utf8"));
const allowed = (c: Case, r: Restriction): Verdict[] =>
  c.avoid.includes(r) ? ["avoid"] : c.ask.includes(r) ? ["ask", "avoid"] : ["ok", "ask"];
const FORBIDDEN = /\b(safe|certified)\b|안전합니다|인증/i;
const norm = (s: string) => s.replace(/\s/g, "");

const only = process.argv[2] as Restriction | undefined;
const rows: string[] = [];
const failures: string[] = [];
let pass = 0, total = 0, forbidden = 0;

for (const r of only ? [only] : RESTRICTIONS) {
  const text = `메뉴판 글자 (사진 대신 텍스트로 제공):\n${cases.map((c) => c.menu).join("\n")}\n\n${userPrompt([r], "en")}`;
  const parsed = ResultSchema.safeParse(await generateJson(SYSTEM_PROMPTS.menu, [{ text }], RESULT_JSON_SCHEMA, 120_000));
  const items = parsed.success ? parsed.data.items : [];
  let p = 0;
  for (const c of cases) {
    const got = items.find((i) => norm(i.name_ko) === norm(c.menu))?.verdict;
    if (got && allowed(c, r).includes(got)) p++;
    else failures.push(`${r} · ${c.menu}: got ${got ?? "missing"}, want ${allowed(c, r).join("|")}`);
  }
  forbidden += items.filter((i) => FORBIDDEN.test(i.reason)).length;
  pass += p;
  total += cases.length;
  rows.push(`| ${r} | ${p}/${cases.length} | ${Math.round((p / cases.length) * 100)}% |`);
  console.log(rows.at(-1));
}

const md = `# Menu eval — ${GEMINI_MODEL}, ${new Date().toISOString().slice(0, 10)}

| Restriction | Pass | Accuracy |
|---|---|---|
${rows.join("\n")}
| **Total** | **${pass}/${total}** | **${Math.round((pass / total) * 100)}%** |

Forbidden wording (safe / certified / 안전합니다 / 인증) in reasons: ${forbidden}

## Failures
${failures.map((f) => `- ${f}`).join("\n") || "- none"}
`;
writeFileSync(new URL("./eval-results.md", import.meta.url), md);
console.log(`\nTotal ${pass}/${total}. Forbidden wording: ${forbidden}. Wrote tests/eval-results.md`);
