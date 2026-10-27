"use client";

import { useState, type ChangeEvent } from "react";
import { compressImage } from "@/lib/image";
import { t, type ErrorCode } from "@/lib/i18n";
import { ALLERGY, RESTRICTIONS, type AnalyzeResult, type Item, type Restriction } from "@/lib/schema";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: AnalyzeResult }
  | { kind: "error"; code: ErrorCode; detail?: string };

const VERDICT_STYLE = {
  ok: "bg-green-700 text-white",
  ask: "bg-yellow-300 text-black",
  avoid: "bg-red-700 text-white",
};
const VERDICT_ICON = { ok: "✓", ask: "?", avoid: "✕" };

const bigBtn =
  "flex w-full items-center justify-center rounded-2xl px-4 py-4 text-lg font-semibold min-h-14 cursor-pointer";

export default function Home() {
  const [photo, setPhoto] = useState<string | null>(null); // base64 JPEG
  const [selected, setSelected] = useState<Restriction[]>([]);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [vendor, setVendor] = useState<Item | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPhoto(await compressImage(file));
      setState({ kind: "idle" });
    } catch (err) {
      setState({ kind: "error", code: (err as Error).message === "too_large" ? "too_large" : "bad_image" });
    }
  }

  async function analyze() {
    if (!photo || !selected.length) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photo, mediaType: "image/jpeg", restrictions: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        const code = data?.error in t.errors ? (data.error as ErrorCode) : "analysis_failed";
        return setState({ kind: "error", code });
      }
      const result = data as AnalyzeResult;
      if (!result.readable || !result.items.length) {
        return setState({ kind: "error", code: "unreadable", detail: result.notes_en });
      }
      setState({ kind: "done", result });
      window.scrollTo(0, 0);
    } catch {
      setState({ kind: "error", code: "network" });
    }
  }

  function reset() {
    setPhoto(null);
    setState({ kind: "idle" });
  }

  const toggle = (r: Restriction) =>
    setSelected((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const hasAllergy = selected.some((r) => ALLERGY.includes(r));

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16 pt-6">
      <h1 className="text-3xl font-bold">{t.title}</h1>
      <p className="mt-1 text-neutral-700">{t.subtitle}</p>

      {state.kind === "done" ? (
        <Results
          result={state.result}
          canShow={(it) => it.verdict !== "ok" || it.confidence === "low" || hasAllergy}
          onVendor={setVendor}
          onReset={reset}
        />
      ) : state.kind === "loading" ? (
        <Loading />
      ) : (
        <>
          {state.kind === "error" && (
            <div role="alert" className="mt-6 rounded-2xl border-2 border-red-700 bg-red-50 p-4">
              <p className="text-lg font-semibold text-red-900">{t.errors[state.code]}</p>
              {state.detail && <p className="mt-1 text-red-900">{state.detail}</p>}
              {photo && state.code !== "bad_image" && state.code !== "too_large" && (
                <button onClick={analyze} className={`${bigBtn} mt-3 bg-red-700 text-white`}>
                  {t.retry}
                </button>
              )}
            </div>
          )}

          <section className="mt-6">
            <p className="rounded-xl bg-amber-100 p-3 text-amber-950">
              📸 {t.uploadHint}
            </p>
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/jpeg;base64,${photo}`}
                alt={t.photoReady}
                className="mt-3 max-h-64 w-full rounded-2xl object-contain bg-neutral-100"
              />
            )}
            <div className="mt-3 grid gap-3">
              <label className={`${bigBtn} bg-neutral-900 text-white`}>
                📷 {photo ? t.changePhoto : t.takePhoto}
                <input type="file" accept="image/*" capture="environment" onChange={onFile} className="sr-only" />
              </label>
              <label className={`${bigBtn} border-2 border-neutral-900`}>
                🖼️ {t.chooseGallery}
                <input type="file" accept="image/*" onChange={onFile} className="sr-only" />
              </label>
            </div>
            <p className="mt-2 text-sm text-neutral-600">🔒 {t.privacy}</p>
          </section>

          <fieldset className="mt-8">
            <legend className="text-xl font-bold">{t.restrictionsTitle}</legend>
            <p className="text-neutral-700">{t.restrictionsHint}</p>
            <div className="mt-3 grid gap-2">
              {RESTRICTIONS.map((r) => (
                <label
                  key={r}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-lg ${
                    selected.includes(r) ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(r)}
                    onChange={() => toggle(r)}
                    className="size-5 accent-white"
                  />
                  {t.restrictions[r]}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            onClick={analyze}
            disabled={!photo || !selected.length}
            className={`${bigBtn} mt-8 bg-blue-700 text-white disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600`}
          >
            {t.analyze}
          </button>
        </>
      )}

      {vendor && <VendorModal item={vendor} onClose={() => setVendor(null)} />}
    </main>
  );
}

function Loading() {
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
  result,
  canShow,
  onVendor,
  onReset,
}: {
  result: AnalyzeResult;
  canShow: (it: Item) => boolean;
  onVendor: (it: Item) => void;
  onReset: () => void;
}) {
  return (
    <section className="mt-6">
      <p className="rounded-xl border-2 border-neutral-900 bg-yellow-100 p-3 font-semibold">⚠️ {t.disclaimer}</p>
      {result.notes_en && <p className="mt-3 text-neutral-700">{result.notes_en}</p>}

      <ul className="mt-4 grid gap-4">
        {result.items.map((it, i) => (
          <li key={i} className="rounded-2xl border-2 border-neutral-300 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold" lang="ko">
                  {it.name_ko}
                </p>
                <p className="text-neutral-700">{it.name_en}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-base font-bold ${VERDICT_STYLE[it.verdict]}`}>
                {VERDICT_ICON[it.verdict]} {t.verdict[it.verdict]}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-700">
              {t.confidence}: <strong>{t.confidenceLevel[it.confidence]}</strong>
            </p>
            <p className="mt-2">{it.reason_en}</p>
            <p className="mt-2 text-sm">
              <span className="font-semibold">{t.likelyIngredients}: </span>
              <span lang="ko">{it.likely_ingredients.join(", ")}</span>
            </p>
            {it.triggered_restrictions.length > 0 && (
              <p className="mt-1 text-sm">
                <span className="font-semibold">{t.flagged}: </span>
                {it.triggered_restrictions.map((r) => t.restrictions[r]).join(", ")}
              </p>
            )}
            {canShow(it) && (
              <button onClick={() => onVendor(it)} className={`${bigBtn} mt-3 bg-neutral-900 text-white`}>
                🗣️ {t.showVendor}
              </button>
            )}
          </li>
        ))}
      </ul>

      <button onClick={onReset} className={`${bigBtn} mt-6 border-2 border-neutral-900`}>
        {t.newPhoto}
      </button>
    </section>
  );
}

function VendorModal({ item, onClose }: { item: Item; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-white p-6 text-black"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <button autoFocus onClick={onClose} className={`${bigBtn} bg-neutral-900 text-white`}>
        ✕ {t.close}
      </button>
      <div className="flex flex-1 flex-col justify-center" lang="ko">
        <p className="text-sm text-neutral-600" lang="en">
          {t.vendorLead}
        </p>
        <p className="mt-2 text-3xl font-semibold">{item.name_ko}</p>
        <p className="mt-6 text-5xl font-bold leading-tight break-keep">{item.ask_ko}</p>
      </div>
    </div>
  );
}
