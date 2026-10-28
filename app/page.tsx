"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { askable, askKo } from "@/lib/ask";
import { compressImage } from "@/lib/image";
import { STRINGS, VENDOR_KO, type Answer, type ErrorCode, type Strings } from "@/lib/i18n";
import { shareResults } from "@/lib/share";
import { SAMPLE_IMAGE, SAMPLE_RESTRICTIONS, sampleResult } from "@/lib/sample";
import {
  ALLERGIES,
  ALLERGY,
  DIETS,
  LANGS,
  MODES,
  MORE_ALLERGIES,
  OTHER_MAX,
  RESTRICTIONS,
  VERDICTS,
  type AnalyzeResult,
  type Item,
  type Lang,
  type Mode,
  type Restriction,
  type Verdict,
} from "@/lib/schema";

// other: the user's free-text restriction as shown to the vendor (Korean from the model when available).
type Run = { restrictions: Restriction[]; mode: Mode; sample: boolean; other: string };
type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: AnalyzeResult; run: Run }
  | { kind: "error"; code: ErrorCode; detail?: string };
// What the vendor screen shows: a Korean question (+ its translation), or just the diet card.
type VendorAsk = {
  title?: string;
  ko: string;
  local?: string;
  restrictions: Restriction[];
  other?: string; // text for the "other" statement
  answerable: boolean;
  onAnswer?: (a: Answer) => void; // lets the result card remember what the vendor said
};

// Plain-Korean lines telling the vendor what the traveler can't eat (fixed text; works offline).
function statementsKo(restrictions: Restriction[], other?: string) {
  return restrictions.map((r) => (r === "other" ? `${VENDOR_KO.statements.other} ${other ?? ""}` : VENDOR_KO.statements[r]));
}

// Reads Korean aloud with the browser's built-in voice: festivals are noisy and small screens are hard to read.
const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
function speakKo(lines: string[]) {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  // End every line with punctuation so the voice pauses between them.
  const text = lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/[.!?:]$/.test(l) ? l : `${l}.`))
    .join(" ");
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

// Keeps the screen on while the phone is handed to the vendor (web pages can't raise brightness; this is the closest).
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let closed = false;
    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then(
        (l) => {
          if (closed) l.release().catch(() => {}); // screen already closed: let go at once
          else lock = l;
        },
        () => {},
      );
    }
    return () => {
      closed = true;
      lock?.release().catch(() => {});
      if (canSpeak()) speechSynthesis.cancel();
    };
  }, []);
}

const VERDICT_STYLE: Record<Verdict, string> = {
  ok: "bg-green-700 text-white",
  ask: "bg-yellow-300 text-black",
  avoid: "bg-red-700 text-white",
};
const VERDICT_ICON: Record<Verdict, string> = { ok: "✓", ask: "?", avoid: "✕" };
const RISK: Record<Verdict, number> = { avoid: 0, ask: 1, ok: 2 };
const NO_RETRY: ErrorCode[] = ["bad_image", "too_large", "server_misconfigured"];
const ANSWER_STYLE: Record<Answer, string> = {
  yes: "bg-red-700 text-white",
  no: "bg-green-700 text-white",
  unsure: "bg-yellow-300 text-black",
};
const ANSWER_ICON: Record<Answer, string> = { yes: "✕", no: "✓", unsure: "?" };

const bigBtn =
  "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-lg font-semibold min-h-14 cursor-pointer";

// Per-viewer conveniences only; the app works without storage.
function load<T>(key: string, ok: (v: unknown) => v is T): T | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return ok(v) ? v : null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
const isLang = (v: unknown): v is Lang => (LANGS as readonly unknown[]).includes(v);
const isMode = (v: unknown): v is Mode => (MODES as readonly unknown[]).includes(v);
const isRestrictions = (v: unknown): v is Restriction[] =>
  Array.isArray(v) && v.every((r) => (RESTRICTIONS as readonly unknown[]).includes(r));

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<Mode>("menu");
  const [selected, setSelected] = useState<Restriction[]>([]);
  const [other, setOther] = useState("");
  const [otherKo, setOtherKo] = useState<{ text: string; ko: string } | null>(null);
  const [emergency, setEmergency] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null); // base64 JPEG, kept only in memory for retry
  const [state, setState] = useState<State>({ kind: "idle" });
  const [vendor, setVendor] = useState<VendorAsk | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const t = STRINGS[lang];

  // Restore language, mode and restrictions after mount (the page is prerendered in English).
  useEffect(() => {
    const browser = navigator.language.slice(0, 2);
    /* eslint-disable react-hooks/set-state-in-effect */
    setLang(load("lang", isLang) ?? (isLang(browser) ? browser : "en"));
    setMode(load("mode", isMode) ?? "menu");
    setSelected(load("restrictions", isRestrictions) ?? []);
    setOther(load("other", (v): v is string => typeof v === "string") ?? "");
    setOtherKo(
      load("other_ko_v2", (v): v is { text: string; ko: string } =>
        typeof v === "object" && v !== null && typeof (v as { ko?: unknown }).ko === "string",
      ),
    );
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Offline shell for the diet/emergency cards. Production only: in dev it would cache hot-reloaded code.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = STRINGS[lang].dir;
    if (!hydrated) return;
    save("lang", lang);
    save("mode", mode);
    save("restrictions", selected);
    save("other", other);
  }, [lang, mode, selected, other, hydrated]);

  const otherText = other.trim();
  const withOther = otherText ? [...selected, "other" as const] : selected;
  // Korean for the vendor when we have it from an earlier analysis of the same text; else the user's own words.
  const otherForVendor = otherKo?.text === otherText ? otherKo.ko : otherText;

  async function analyze(image: string) {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mediaType: "image/jpeg", restrictions: withOther, other: otherText, lang, mode }),
        signal: AbortSignal.timeout(70_000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const code = data?.error in t.errors ? (data.error as ErrorCode) : "analysis_failed";
        return setState({ kind: "error", code });
      }
      const result = data as AnalyzeResult;
      if (!result.readable || !result.items.length) {
        return setState({ kind: "error", code: "unreadable", detail: result.notes });
      }
      const run: Run = { restrictions: withOther, mode, sample: false, other: result.other_ko || otherText };
      // Remember the Korean wording so the offline diet/emergency cards can show it too.
      if (otherText && result.other_ko) {
        setOtherKo({ text: otherText, ko: result.other_ko });
        save("other_ko_v2", { text: otherText, ko: result.other_ko });
      }
      setState({ kind: "done", result, run });
      window.scrollTo(0, 0);
    } catch (err) {
      setState({ kind: "error", code: (err as Error).name === "TimeoutError" ? "timeout" : "network" });
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const b64 = await compressImage(file);
      setPhoto(b64);
      await analyze(b64);
    } catch (err) {
      setState({ kind: "error", code: (err as Error).message === "too_large" ? "too_large" : "bad_image" });
    }
  }

  function trySample() {
    setPhoto(null);
    setState({
      kind: "done",
      result: sampleResult(lang),
      run: { restrictions: SAMPLE_RESTRICTIONS, mode: "menu", sample: true, other: "" },
    });
    window.scrollTo(0, 0);
  }

  const showDietCard = () =>
    setVendor({ ko: VENDOR_KO.dietCardAsk, local: t.dietCardAsk, restrictions: withOther, other: otherForVendor, answerable: true });
  const toggle = (r: Restriction) =>
    setSelected((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const ready = withOther.length > 0;

  const chips = (group: readonly Restriction[]) => (
    <div className="mt-1 flex flex-wrap gap-2">
      {group.map((r) => {
        const on = selected.includes(r);
        return (
          <button
            key={r}
            aria-pressed={on}
            onClick={() => toggle(r)}
            className={`min-h-11 rounded-full border-2 px-3 text-base ${
              on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white"
            }`}
          >
            {on ? "✓ " : ""}
            {t.restrictions[r]}
          </button>
        );
      })}
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 pt-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t.title}</h1>
        <button
          onClick={() => setEmergency(true)}
          aria-label={t.emergency}
          className="ms-auto min-h-11 shrink-0 rounded-lg bg-red-700 px-3 text-sm font-bold text-white"
        >
          🚨 SOS
        </button>
        <select
          aria-label="Language"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="rounded-lg border-2 border-neutral-300 bg-white px-2 py-1 text-base"
        >
          {LANGS.map((l) => (
            <option key={l} value={l}>
              {STRINGS[l].langName}
            </option>
          ))}
        </select>
      </header>
      <p className="mt-1 text-neutral-700">{t.tagline}</p>

      {state.kind === "done" ? (
        <Results
          t={t}
          result={state.run.sample ? sampleResult(lang) : state.result}
          run={state.run}
          photo={state.run.sample ? null : photo}
          onVendor={setVendor}
          onReset={() => {
            setPhoto(null);
            setState({ kind: "idle" });
          }}
        />
      ) : state.kind === "loading" ? (
        <Loading t={t} photo={photo} />
      ) : (
        <>
          {state.kind === "error" && (
            <div role="alert" className="mt-4 rounded-2xl border-2 border-red-700 bg-red-50 p-4">
              <p className="text-lg font-semibold text-red-900">{t.errors[state.code]}</p>
              {state.detail && <p className="mt-1 text-red-900">{state.detail}</p>}
              {photo && !NO_RETRY.includes(state.code) && (
                <button onClick={() => analyze(photo)} className={`${bigBtn} mt-3 bg-red-700 text-white`}>
                  ↻ {t.retry}
                </button>
              )}
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-neutral-200 p-1" role="group">
            {MODES.map((m) => (
              <button
                key={m}
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`min-h-11 rounded-xl px-2 font-semibold ${mode === m ? "bg-white shadow" : "text-neutral-700"}`}
              >
                {m === "menu" ? `📋 ${t.modeMenu}` : `🏷️ ${t.modeLabel}`}
              </button>
            ))}
          </div>

          <fieldset className="mt-3">
            <legend className="text-lg font-bold">{t.restrictionsTitle}</legend>
            <p className="mt-1 text-sm font-semibold text-neutral-600">{t.groupDiet}</p>
            {chips(DIETS)}
            <p className="mt-2 text-sm font-semibold text-neutral-600">{t.groupAllergy}</p>
            {chips(ALLERGIES)}
            <details className="mt-1" open={MORE_ALLERGIES.some((r) => selected.includes(r)) || !!otherText}>
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-neutral-700">
                {t.moreAllergies}
              </summary>
              {chips(MORE_ALLERGIES)}
              <label className="mt-2 block text-sm font-semibold text-neutral-600">
                {t.otherLabel}
                <input
                  value={other}
                  onChange={(e) => setOther(e.target.value.slice(0, OTHER_MAX))}
                  placeholder={t.otherPlaceholder}
                  className="mt-1 block min-h-11 w-full rounded-xl border-2 border-neutral-300 px-3 text-base font-normal"
                />
              </label>
            </details>
            {ready && <p className="mt-1 text-xs text-neutral-600">💾 {t.saved}</p>}
          </fieldset>

          <section className="mt-3 grid gap-2">
            {!ready && <p className="font-semibold text-amber-800">↑ {t.restrictionsHint}</p>}
            <label
              aria-disabled={!ready}
              className={`${bigBtn} ${ready ? "bg-blue-700 text-white" : "pointer-events-none bg-neutral-300 text-neutral-600"}`}
            >
              📷 {t.takePhoto}
              <input type="file" accept="image/*" capture="environment" onChange={onFile} disabled={!ready} className="sr-only" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                aria-disabled={!ready}
                className={`${bigBtn} border-2 ${ready ? "border-neutral-900" : "pointer-events-none border-neutral-300 text-neutral-500"}`}
              >
                🖼️ {t.chooseGallery}
                <input type="file" accept="image/*" onChange={onFile} disabled={!ready} className="sr-only" />
              </label>
              <button onClick={trySample} className={`${bigBtn} border-2 border-neutral-900`}>
                ✨ {t.trySample}
              </button>
            </div>
            {ready && (
              <button onClick={showDietCard} className={`${bigBtn} border-2 border-neutral-900 bg-amber-50`}>
                🪪 {t.dietCard}
              </button>
            )}
            <p className="text-sm text-neutral-700">📸 {t.uploadHint[mode]}</p>
            <p className="text-sm text-neutral-700">🔒 {t.privacy}</p>
            <p className="text-sm text-neutral-700">📲 {t.offlineHint}</p>
          </section>
        </>
      )}

      {vendor && <VendorScreen t={t} ask={vendor} onClose={() => setVendor(null)} />}
      {emergency && (
        <EmergencyScreen
          t={t}
          allergies={withOther.filter((r) => ALLERGY.includes(r) || r === "other")}
          other={otherForVendor}
          onClose={() => setEmergency(false)}
        />
      )}
    </main>
  );
}

function Loading({ t, photo }: { t: Strings; photo: string | null }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, t.analyzingSteps.length - 1)), 3000);
    return () => clearInterval(id);
  }, [t]);
  return (
    <div className="mt-6" aria-busy="true">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/jpeg;base64,${photo}`} alt="" className="mx-auto max-h-40 rounded-xl opacity-80" />
      )}
      <p className="mt-4 text-lg font-semibold" role="status">
        ⏳ {t.analyzingSteps[step]}
      </p>
      {[0, 1].map((i) => (
        <div key={i} className="mt-4 h-28 animate-pulse rounded-2xl bg-neutral-200" />
      ))}
    </div>
  );
}

function Results({
  t,
  result,
  run,
  photo,
  onVendor,
  onReset,
}: {
  t: Strings;
  result: AnalyzeResult;
  run: Run;
  photo: string | null;
  onVendor: (v: VendorAsk) => void;
  onReset: () => void;
}) {
  const [filter, setFilter] = useState<Verdict | "all">("all");
  const [riskFirst, setRiskFirst] = useState(true);
  const [answers, setAnswers] = useState<Record<number, Answer>>({}); // vendor answers, by item index
  const hasAllergy = run.restrictions.some((r) => ALLERGY.includes(r));
  // Like a food-scanner "better alternatives" list: OK items from the same board, shown on AVOID cards.
  const alternatives = result.items.filter((i) => i.verdict === "ok").map((i) => `${i.name_ko} (${i.name})`).slice(0, 3);
  const count = (v: Verdict) => result.items.filter((i) => i.verdict === v).length;

  const shown = result.items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => filter === "all" || it.verdict === filter)
    .sort((a, b) => (riskFirst ? RISK[a.it.verdict] - RISK[b.it.verdict] : 0) || a.i - b.i);

  return (
    <section className="mt-3">
      <p className="rounded-xl border-2 border-neutral-900 bg-yellow-100 px-3 py-2 text-sm font-semibold">
        ⚠️ {t.disclaimer}
      </p>

      {run.sample && (
        <div className="mt-3 rounded-xl bg-blue-50 p-3">
          <p className="font-semibold text-blue-900">✨ {t.sampleBanner}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SAMPLE_IMAGE} alt="" className="mx-auto mt-2 max-h-48 rounded-lg" />
        </div>
      )}
      {photo && (
        // Lets the traveler match cards to the real board.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/jpeg;base64,${photo}`} alt={t.myPhoto} className="mx-auto mt-3 max-h-48 rounded-xl" />
      )}

      <p className="mt-3 text-xl font-bold">
        {t.summary(result.items.length, count("ok"), count("ask"), count("avoid"))}
      </p>
      {result.notes && !run.sample && <p className="mt-1 text-neutral-700">{result.notes}</p>}

      {(result.label_contains || result.label_facility) && (
        <div className="mt-3 grid gap-2">
          {result.label_contains && (
            <p className="rounded-xl border-2 border-red-700 bg-red-50 p-3">
              <strong>{t.labelContains}: </strong>
              <span lang="ko">{result.label_contains}</span>
            </p>
          )}
          {result.label_facility && (
            <p className="rounded-xl border-2 border-amber-600 bg-amber-50 p-3">
              <strong>{t.labelFacility}: </strong>
              <span lang="ko">{result.label_facility}</span>
            </p>
          )}
        </div>
      )}

      {result.ask_all_ko && run.mode === "menu" && (
        <button
          onClick={() =>
            onVendor({
              ko: result.ask_all_ko,
              local: result.ask_all,
              restrictions: run.restrictions,
              other: run.other,
              answerable: false,
            })
          }
          className={`${bigBtn} mt-3 bg-neutral-900 text-white`}
        >
          🗣️ {t.askAll}
        </button>
      )}

      <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-neutral-200 p-1" role="group">
        {(["all", ...VERDICTS] as const).map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-11 rounded-xl px-1 text-sm font-semibold ${filter === f ? "bg-white shadow" : "text-neutral-700"}`}
          >
            {f === "all" ? `${t.all} ${result.items.length}` : `${VERDICT_ICON[f]} ${t.verdict[f]} ${count(f)}`}
          </button>
        ))}
      </div>
      <button onClick={() => setRiskFirst((v) => !v)} className="mt-2 min-h-11 text-base font-semibold underline">
        ⇅ {riskFirst ? t.sortRisk : t.sortMenu}
      </button>

      <ul className="mt-2 grid gap-3">
        {shown.map(({ it, i }) => {
          const asks = askable(it.name_ko, it.ask_about);
          return (
          <Card
            key={i}
            t={t}
            it={it}
            mode={run.mode}
            hasAllergy={hasAllergy}
            canAsk={asks.length > 0}
            alternatives={it.verdict === "avoid" ? alternatives : []}
            answer={answers[i]}
            onVendor={() =>
              onVendor({
                title: it.name_ko,
                ko: askKo(it.name_ko, asks.map((a) => a.ko)),
                local: t.askLocal(it.name, asks.map((a) => a.local)),
                restrictions: run.restrictions,
                other: run.other,
                answerable: true,
                onAnswer: (a) => setAnswers((s) => ({ ...s, [i]: a })),
              })
            }
          />
          );
        })}
      </ul>

      <div className="mt-6 grid gap-2">
        <button onClick={() => shareResults(result, t)} className={`${bigBtn} border-2 border-neutral-900`}>
          📤 {t.share}
        </button>
        <button onClick={onReset} className={`${bigBtn} bg-blue-700 text-white`}>
          📷 {t.newPhoto}
        </button>
      </div>
    </section>
  );
}

function Card({
  t,
  it,
  mode,
  hasAllergy,
  canAsk,
  alternatives,
  answer,
  onVendor,
}: {
  t: Strings;
  it: Item;
  mode: Mode;
  canAsk: boolean;
  alternatives: string[];
  hasAllergy: boolean;
  answer?: Answer;
  onVendor: () => void;
}) {
  // A clear AVOID with nothing left to ask ("군밤" for a nut allergy) gets no question button.
  const showVendor = canAsk || (it.verdict !== "avoid" && (it.verdict === "ask" || it.confidence === "low" || hasAllergy));
  // Compact by default (a 15-item menu must stay scannable): name, verdict, reason, flagged ingredients.
  // Everything else sits behind a native <details>.
  return (
    <li className="rounded-2xl border-2 border-neutral-300 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-bold" lang="ko">
            {it.name_ko}
          </p>
          <p className="text-sm text-neutral-700">{it.name}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-base font-bold ${VERDICT_STYLE[it.verdict]}`}>
          {VERDICT_ICON[it.verdict]} {t.verdict[it.verdict]}
        </span>
      </div>
      {it.about && <p className="mt-1 text-sm text-neutral-600">{it.about}</p>}
      <p className="mt-2 text-base">{it.reason}</p>
      {it.flagged_ingredients.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {it.flagged_ingredients.map((ing, j) => (
            <li key={j} className="rounded-full bg-red-700 px-2 py-0.5 text-sm font-bold text-white">
              ⚠ {ing}
            </li>
          ))}
        </ul>
      )}
      {alternatives.length > 0 && (
        <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-900">
          <span className="font-semibold">✓ {t.tryInstead}</span> <span lang="ko">{alternatives.join(", ")}</span>
        </p>
      )}
      {answer && (
        <p className={`mt-2 rounded-xl px-3 py-2 text-sm font-bold ${ANSWER_STYLE[answer]}`}>
          🗣️ {t.vendorAnswered} {ANSWER_ICON[answer]} {t.answer[answer]}
        </p>
      )}
      {hasAllergy && it.verdict !== "avoid" && <p className="mt-2 text-sm font-bold text-red-800">⚠️ {t.confirmVendor}</p>}
      {showVendor && (
        <button onClick={onVendor} className={`${bigBtn} mt-2 min-h-12 bg-neutral-900 py-2 text-base text-white`}>
          🗣️ {answer ? t.askAgain : t.showVendor}
        </button>
      )}
      <details className="mt-2 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-neutral-700">{t.details}</summary>
        <p className="text-neutral-700">
          {t.confidence}: <strong>{t.confidenceLevel[it.confidence]}</strong>
        </p>
        <p className="mt-2 font-semibold">{mode === "label" ? t.labelIngredients : t.likelyIngredients}</p>
        <ul className="mt-1 flex flex-wrap gap-1">
          {it.likely_ingredients.map((ing, j) => {
            const hit = it.flagged_ingredients.includes(ing);
            return (
              <li key={j} className={`rounded-full px-2 py-0.5 ${hit ? "bg-red-700 font-bold text-white" : "bg-neutral-100"}`}>
                {hit ? "⚠ " : ""}
                {ing}
              </li>
            );
          })}
        </ul>
        {it.triggered_restrictions.length > 0 && (
          <p className="mt-2">
            <span className="font-semibold">{t.flagged}: </span>
            {it.triggered_restrictions.map((r) => t.restrictions[r]).join(", ")}
          </p>
        )}
      </details>
    </li>
  );
}

// Full-screen, high-contrast. Top: Korean for the vendor (who they are talking to, what they can't eat, the question,
// tap-to-answer buttons). After a tap: the answer in the traveler's language.
function VendorScreen({ t, ask, onClose }: { t: Strings; ask: VendorAsk; onClose: () => void }) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  useWakeLock();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 overflow-y-auto bg-white text-black">
      <div className="mx-auto flex min-h-full max-w-xl flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-neutral-600">{answer ? t.vendorSays : t.vendorLead}</p>
          <button autoFocus onClick={onClose} className="min-h-12 shrink-0 rounded-xl bg-neutral-900 px-4 text-lg font-semibold text-white">
            ✕ {t.close}
          </button>
        </div>

        {answer ? (
          <div className="flex flex-1 flex-col justify-center">
            <p className={`rounded-2xl p-6 text-3xl font-bold ${ANSWER_STYLE[answer]}`}>
              {ANSWER_ICON[answer]} {t.answer[answer]}
            </p>
            <p className="mt-4 text-lg">{t.answerAdvice[answer]}</p>
            {ask.local && (
              <p className="mt-4 text-sm text-neutral-600">
                {t.youAsk} {ask.local}
              </p>
            )}
            <button onClick={() => setAnswer(null)} className={`${bigBtn} mt-6 border-2 border-neutral-900`}>
              ↺ {t.askAgain}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 flex-1" lang="ko" dir="ltr">
              <p className="text-xl font-semibold">{VENDOR_KO.greeting}</p>
              {ask.restrictions.length > 0 && (
                <ul className="mt-3 grid gap-1 text-xl">
                  {statementsKo(ask.restrictions, ask.other).map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                  {ask.restrictions.some((r) => ALLERGY.includes(r)) && (
                    <li className="font-bold text-red-800">⚠️ {VENDOR_KO.severe}</li>
                  )}
                </ul>
              )}
              {ask.title && <p className="mt-6 text-2xl font-semibold text-neutral-700">{ask.title}</p>}
              <p className="mt-2 text-4xl font-bold leading-tight break-keep">{ask.ko}</p>
              {canSpeak() && (
                <button
                  onClick={() =>
                    speakKo([VENDOR_KO.greeting, ...statementsKo(ask.restrictions, ask.other), ask.ko])
                  }
                  className="mt-3 min-h-11 rounded-xl border-2 border-neutral-900 px-4 text-base font-semibold"
                >
                  🔊 {t.readAloud}
                </button>
              )}
              {!ask.answerable && <p className="mt-6 text-xl font-semibold text-neutral-800">{VENDOR_KO.pleasePoint}</p>}
              {ask.answerable && (
                <>
                  <p className="mt-6 text-lg text-neutral-700">{VENDOR_KO.pleaseAnswer}</p>
                  <div className="mt-2 grid gap-2">
                    {(["yes", "no", "unsure"] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => {
                          setAnswer(a);
                          ask.onAnswer?.(a);
                        }}
                        className={`${bigBtn} text-2xl ${ANSWER_STYLE[a]}`}
                      >
                        {VENDOR_KO.answer[a]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {ask.local && (
              <p className="mt-6 border-t pt-3 text-sm text-neutral-600">
                {t.youAsk} {ask.local}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Allergy emergency card (like Equal Eats' emergency card): fixed Korean text, works offline, one tap to call 119.
function EmergencyScreen({
  t,
  allergies,
  other,
  onClose,
}: {
  t: Strings;
  allergies: Restriction[];
  other: string;
  onClose: () => void;
}) {
  useWakeLock();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 overflow-y-auto bg-red-700 text-white">
      <div className="mx-auto flex min-h-full max-w-xl flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">{t.emergencyLead}</p>
          <button autoFocus onClick={onClose} className="min-h-12 shrink-0 rounded-xl bg-white px-4 text-lg font-semibold text-black">
            ✕ {t.close}
          </button>
        </div>
        <div className="mt-6 flex-1" lang="ko" dir="ltr">
          <p className="text-4xl font-bold leading-tight break-keep">{VENDOR_KO.emergencyTitle}</p>
          {canSpeak() && (
            <button
              onClick={() =>
                speakKo([
                  VENDOR_KO.emergencyTitle.replace("🚨", ""),
                  ...VENDOR_KO.emergencyLines,
                  ...(allergies.length ? [VENDOR_KO.emergencyMine, ...statementsKo(allergies, other)] : []),
                ])
              }
              className="mt-3 min-h-11 rounded-xl bg-white px-4 text-base font-semibold text-red-700"
            >
              🔊 {t.readAloud}
            </button>
          )}
          <ul className="mt-6 grid gap-3 text-2xl font-semibold break-keep">
            {VENDOR_KO.emergencyLines.map((l) => (
              <li key={l}>• {l}</li>
            ))}
          </ul>
          {allergies.length > 0 && (
            <div className="mt-6 rounded-2xl bg-white p-4 text-xl text-black">
              <p className="font-bold">{VENDOR_KO.emergencyMine}</p>
              <ul className="mt-2 grid gap-1">
                {statementsKo(allergies, other).map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <a href="tel:119" className={`${bigBtn} mt-6 bg-white text-2xl font-bold text-red-700`}>
          📞 {t.call119}
        </a>
        <p className="mt-2 text-center text-sm">{t.emergencyNote}</p>
      </div>
    </div>
  );
}
