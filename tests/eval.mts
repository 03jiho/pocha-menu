// Safety check of the menu prompt: sends the 30 menu names as text (one request per restriction) through the real
// prompt and compares verdicts with tests/menu-cases.json.
// Run: npm run eval -- [restriction]   (reads GEMINI_API_KEY from .env.local) → writes tests/eval-results.md
//
// The headline is DANGEROUS misses, not accuracy: the one mistake that matters is calling something "ok" that the
// expectations say contains (or may contain) the restricted ingredient. Being more cautious is by design.
//   expected avoid → avoid: correct · ask: cautious (fine) · ok: DANGEROUS
//   expected ask   → ask/avoid: correct · ok: DANGEROUS
//   not listed     → ok/ask: correct · avoid: false alarm (inconvenient, not unsafe)
// Expectations in menu-cases.json are hand-written for typical stall recipes, not ground truth.
import { readFileSync, writeFileSync } from "node:fs";
import { GEMINI_MODEL, generateJson } from "../lib/gemini.ts";
import { SYSTEM_PROMPTS, userPrompt } from "../lib/prompt.ts";
import { RESULT_JSON_SCHEMA, ResultSchema, type Restriction, type Verdict } from "../lib/schema.ts";

// Only restrictions that menu-cases.json has expectations for (halal/vegetarian/soy/sesame are not labeled yet).
const EVAL_RESTRICTIONS: Restriction[] = ["pork", "beef", "crustacean", "nuts", "egg", "dairy", "wheat", "fish", "vegan"];

type Case = { menu: string; avoid: Restriction[]; ask: Restriction[] };
type Grade = "correct" | "cautious" | "dangerous" | "false_alarm" | "missing";
const cases: Case[] = JSON.parse(readFileSync(new URL("./menu-cases.json", import.meta.url), "utf8"));
const FORBIDDEN = /\b(safe|certified)\b|안전합니다|인증/i;
const norm = (s: string) => s.replace(/\s/g, "");

function grade(c: Case, r: Restriction, got: Verdict | undefined): Grade {
  if (!got) return "missing";
  if (c.avoid.includes(r)) return got === "avoid" ? "correct" : got === "ask" ? "cautious" : "dangerous";
  if (c.ask.includes(r)) return got === "ok" ? "dangerous" : "correct";
  return got === "avoid" ? "false_alarm" : "correct";
}

const only = process.argv[2] as Restriction | undefined;
const rows: string[] = [];
const details: Record<Exclude<Grade, "correct">, string[]> = { dangerous: [], cautious: [], false_alarm: [], missing: [] };
const totals: Record<Grade, number> = { correct: 0, cautious: 0, dangerous: 0, false_alarm: 0, missing: 0 };
let forbidden = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The free tier returns 429/503 under load: wait and retry a few times instead of dying mid-run.
async function ask(text: string) {
  for (let i = 1; ; i++) {
    try {
      return await generateJson(SYSTEM_PROMPTS.menu, [{ text }], RESULT_JSON_SCHEMA, 120_000);
    } catch (err) {
      if (i >= 4) throw err;
      console.log(`  retry ${i} after ${(err as Error).name}…`);
      await sleep(30_000);
    }
  }
}

let stoppedEarly = "";
for (const [n, r] of (only ? [only] : EVAL_RESTRICTIONS).entries()) {
  if (n > 0) await sleep(15_000); // stay under the free-tier per-minute quota
  const text = `Menu board text (given as text instead of a photo):\n${cases.map((c) => c.menu).join("\n")}\n\n${userPrompt([r], "en")}`;
  let json: unknown;
  try {
    json = await ask(text);
  } catch (err) {
    // Out of quota etc.: keep what we have instead of losing the whole run.
    stoppedEarly = `Stopped before "${r}": ${(err as { status?: number }).status ?? (err as Error).name}`;
    console.log(stoppedEarly);
    break;
  }
  const parsed = ResultSchema.safeParse(json);
  const items = parsed.success ? parsed.data.items : [];
  const counts: Record<Grade, number> = { correct: 0, cautious: 0, dangerous: 0, false_alarm: 0, missing: 0 };
  for (const c of cases) {
    const got = items.find((i) => norm(i.name_ko) === norm(c.menu))?.verdict;
    const g = grade(c, r, got);
    counts[g]++;
    totals[g]++;
    if (g !== "correct") details[g].push(`${r} · ${c.menu}: got ${got ?? "missing"}`);
  }
  forbidden += items.filter((i) => FORBIDDEN.test(i.reason)).length;
  rows.push(`| ${r} | ${counts.dangerous} | ${counts.cautious} | ${counts.false_alarm} | ${counts.correct} | ${counts.missing} |`);
  console.log(rows.at(-1));
}

const list = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n") || "- none";
const md = `# Menu safety check — ${GEMINI_MODEL}, ${new Date().toISOString().slice(0, 10)}

**Dangerous misses (said OK when it contains / may contain the restricted ingredient): ${totals.dangerous}**
${stoppedEarly ? `\n> Partial run. ${stoppedEarly}\n` : ""}
| Restriction | Dangerous | Cautious (avoid→ask) | False alarm | Correct | Missing |
|---|---|---|---|---|---|
${rows.join("\n")}
| **Total** | **${totals.dangerous}** | ${totals.cautious} | ${totals.false_alarm} | ${totals.correct} | ${totals.missing} |

Forbidden wording (safe / certified / 안전합니다 / 인증) in reasons: ${forbidden}

## Dangerous misses
${list(details.dangerous)}

## Cautious (expected avoid, got ask — by design)
${list(details.cautious)}

## False alarms (expected ok/ask, got avoid)
${list(details.false_alarm)}

## Missing
${list(details.missing)}
`;
writeFileSync(new URL("./eval-results.md", import.meta.url), md);
console.log(`\nDangerous misses: ${totals.dangerous}. Forbidden wording: ${forbidden}. Wrote tests/eval-results.md`);
