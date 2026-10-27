"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { compressImage } from "@/lib/image";
import { STRINGS, type ErrorCode, type Strings } from "@/lib/i18n";
import { shareResults } from "@/lib/share";
import { SAMPLE_IMAGE, SAMPLE_RESTRICTIONS, SAMPLE_RESULT } from "@/lib/sample";
import {
  ALLERGY,
  LANGS,
  RESTRICTIONS,
  VERDICTS,
  type AnalyzeResult,
  type Item,
  type Lang,
  type Mode,
  type Restriction,
  type Verdict,
} from "@/lib/schema";

type Run = { restrictions: Restriction[]; mode: Mode; sample: boolean };
type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: AnalyzeResult; run: Run }
  | { kind: "error"; code: ErrorCode; detail?: string };
type VendorText = { title?: string; text: string };

const VERDICT_STYLE: Record<Verdict, string> = {
  ok: "bg-green-700 text-white",
  ask: "bg-yellow-300 text-black",
  avoid: "bg-red-700 text-white",
};
const VERDICT_ICON: Record<Verdict, string> = { ok: "✓", ask: "?", avoid: "✕" };
const RISK: Record<Verdict, number> = { avoid: 0, ask: 1, ok: 2 };
const NO_RETRY: ErrorCode[] = ["bad_image", "too_large", "server_misconfigured"];

const bigBtn =
  "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-lg font-semibold min-h-14 cursor-pointer";

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [mode, setMode] = useState<Mode>("menu");
  const [selected, setSelected] = useState<Restriction[]>([]);
  const [photo, setPhoto] = useState<string | null>(null); // base64 JPEG, kept only in memory for retry
  const [state, setState] = useState<State>({ kind: "idle" });
  const [vendor, setVendor] = useState<VendorText | null>(null);
  const t = STRINGS[lang];

  // Pick the saved or browser language after mount (the page is prerendered in English).
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("lang");
    } catch {}
    const guess = saved ?? navigator.language.slice(0, 2);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if ((LANGS as readonly string[]).includes(guess)) setLang(guess as Lang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = STRINGS[lang].dir;
    try {
      localStorage.setItem("lang", lang);
    } catch {}
  }, [lang]);

  async function analyze(image: string) {
    const run: Run = { restrictions: selected, mode, sample: false };
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mediaType: "image/jpeg", restrictions: selected, lang, mode }),
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
    setSelected(SAMPLE_RESTRICTIONS);
    setMode("menu");
    setPhoto(null);
    setState({ kind: "done", result: SAMPLE_RESULT, run: { restrictions: SAMPLE_RESTRICTIONS, mode: "menu", sample: true } });
    window.scrollTo(0, 0);
  }

  const toggle = (r: Restriction) =>
    setSelected((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const ready = selected.length > 0;

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 pt-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t.title}</h1>
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
          result={state.result}
          run={state.run}
          onVendor={setVendor}
          onReset={() => {
            setPhoto(null);
            setState({ kind: "idle" });
          }}
        />
      ) : state.kind === "loading" ? (
        <Loading t={t} />
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
            {(["menu", "label"] as const).map((m) => (
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
            <div className="mt-2 flex flex-wrap gap-2">
              {RESTRICTIONS.map((r) => {
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
          </fieldset>

          <section className="mt-4 grid gap-2">
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
            <p className="text-sm text-neutral-700">📸 {t.uploadHint[mode]}</p>
            <p className="text-sm text-neutral-700">🔒 {t.privacy}</p>
          </section>
        </>
      )}

      {vendor && <VendorModal t={t} vendor={vendor} onClose={() => setVendor(null)} />}
    </main>
  );
}

function Loading({ t }: { t: Strings }) {
  return (
    <div className="mt-6" aria-busy="true">
      <p className="text-lg font-semibold" role="status">
        {t.analyzing}
      </p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-4 h-36 animate-pulse rounded-2xl bg-neutral-200" />
      ))}
    </div>
  );
}

function Results({
  t,
  result,
  run,
  onVendor,
  onReset,
}: {
  t: Strings;
  result: AnalyzeResult;
  run: Run;
  onVendor: (v: VendorText) => void;
  onReset: () => void;
}) {
  const [filter, setFilter] = useState<Verdict | "all">("all");
  const [riskFirst, setRiskFirst] = useState(true);
  const hasAllergy = run.restrictions.some((r) => ALLERGY.includes(r));
  const count = (v: Verdict) => result.items.filter((i) => i.verdict === v).length;

  const shown = result.items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => filter === "all" || it.verdict === filter)
    .sort((a, b) => (riskFirst ? RISK[a.it.verdict] - RISK[b.it.verdict] : 0) || a.i - b.i);

  return (
    <section className="mt-3">
      <p className="sticky top-0 z-10 rounded-xl border-2 border-neutral-900 bg-yellow-100 p-3 font-semibold">
        ⚠️ {t.disclaimer}
      </p>

      {run.sample && (
        <div className="mt-3 rounded-xl bg-blue-50 p-3">
          <p className="font-semibold text-blue-900">✨ {t.sampleBanner}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SAMPLE_IMAGE} alt="" className="mx-auto mt-2 max-h-48 rounded-lg" />
        </div>
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
          onClick={() => onVendor({ text: result.ask_all_ko })}
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

      <ul className="mt-2 grid gap-4">
        {shown.map(({ it, i }) => (
          <Card
            key={i}
            t={t}
            it={it}
            mode={run.mode}
            hasAllergy={hasAllergy}
            onVendor={() => onVendor({ title: it.name_ko, text: it.ask_ko })}
          />
        ))}
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
  onVendor,
}: {
  t: Strings;
  it: Item;
  mode: Mode;
  hasAllergy: boolean;
  onVendor: () => void;
}) {
  const showVendor = it.verdict !== "ok" || it.confidence === "low" || hasAllergy;
  return (
    <li className="rounded-2xl border-2 border-neutral-300 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold" lang="ko">
            {it.name_ko}
          </p>
          <p className="text-neutral-700">{it.name}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-base font-bold ${VERDICT_STYLE[it.verdict]}`}>
          {VERDICT_ICON[it.verdict]} {t.verdict[it.verdict]}
        </span>
      </div>
      <p className="mt-2 text-sm text-neutral-700">
        {t.confidence}: <strong>{t.confidenceLevel[it.confidence]}</strong>
      </p>
      <p className="mt-2">{it.reason}</p>

      <p className="mt-3 text-sm font-semibold">{mode === "label" ? t.labelIngredients : t.likelyIngredients}</p>
      <ul className="mt-1 flex flex-wrap gap-1" lang="ko">
        {it.likely_ingredients.map((ing, j) => {
          const hit = it.flagged_ingredients.includes(ing);
          return (
            <li
              key={j}
              className={`rounded-full px-2 py-0.5 text-sm ${hit ? "bg-red-700 font-bold text-white" : "bg-neutral-100"}`}
            >
              {hit ? "⚠ " : ""}
              {ing}
            </li>
          );
        })}
      </ul>
      {it.triggered_restrictions.length > 0 && (
        <p className="mt-2 text-sm">
          <span className="font-semibold">{t.flagged}: </span>
          {it.triggered_restrictions.map((r) => t.restrictions[r]).join(", ")}
        </p>
      )}
      {hasAllergy && <p className="mt-2 text-sm font-bold text-red-800">⚠️ {t.confirmVendor}</p>}
      {showVendor && (
        <button onClick={onVendor} className={`${bigBtn} mt-3 bg-neutral-900 text-white`}>
          🗣️ {t.showVendor}
        </button>
      )}
    </li>
  );
}

function VendorModal({ t, vendor, onClose }: { t: Strings; vendor: VendorText; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The whole screen is one button: a single tap anywhere closes it.
  return (
    <button
      autoFocus
      onClick={onClose}
      aria-label={t.tapToClose}
      className="fixed inset-0 z-50 flex flex-col bg-white p-6 text-start text-black"
    >
      <span className="text-base text-neutral-600">
        {t.vendorLead} · {t.tapToClose}
      </span>
      <span className="flex flex-1 flex-col justify-center" lang="ko" dir="ltr">
        {vendor.title && <span className="text-3xl font-semibold">{vendor.title}</span>}
        <span className="mt-4 text-5xl font-bold leading-tight break-keep">{vendor.text}</span>
      </span>
    </button>
  );
}
