import type { Strings } from "./i18n";
import type { AnalyzeResult } from "./schema";

const BADGE = { ok: ["#15803d", "#fff"], ask: ["#facc15", "#000"], avoid: ["#b91c1c", "#fff"] } as const;
const font = (px: number, weight = 400) =>
  `${weight} ${px}px system-ui, "Apple SD Gothic Neo", "Noto Sans KR", "Noto Sans Arabic", sans-serif`;

// Draws the result list onto a canvas and shares it (or downloads it where Web Share with files isn't supported).
export async function shareResults(result: AnalyzeResult, t: Strings) {
  const W = 1080, P = 56, ROW = 130, TOP = 300;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = TOP + result.items.length * ROW + 60;
  const x = c.getContext("2d")!;
  const rtl = t.dir === "rtl";
  const X = (px: number) => (rtl ? W - px : px);
  x.direction = t.dir;
  x.textAlign = "start";

  x.fillStyle = "#fff";
  x.fillRect(0, 0, W, c.height);
  x.fillStyle = "#111";
  x.font = font(60, 700);
  x.fillText(t.title, X(P), 110);
  const n = (v: string) => result.items.filter((i) => i.verdict === v).length;
  x.font = font(34, 600);
  x.fillText(t.summary(result.items.length, n("ok"), n("ask"), n("avoid")), X(P), 175, W - 2 * P);
  x.font = font(26);
  x.fillStyle = "#444";
  x.fillText(t.disclaimer, X(P), 230, W - 2 * P);

  result.items.forEach((it, i) => {
    const y = TOP + i * ROW;
    const [bg, fg] = BADGE[it.verdict];
    x.fillStyle = bg;
    x.fillRect(rtl ? W - P - 220 : P, y, 220, 84);
    x.fillStyle = fg;
    x.font = font(34, 700);
    x.textAlign = "center";
    x.fillText(t.verdict[it.verdict], rtl ? W - P - 110 : P + 110, y + 55, 200);
    x.textAlign = "start";
    x.fillStyle = "#111";
    x.font = font(44, 700);
    x.fillText(it.name_ko, X(P + 250), y + 42, W - 2 * P - 250);
    x.fillStyle = "#555";
    x.font = font(28);
    x.fillText(it.name, X(P + 250), y + 84, W - 2 * P - 250);
  });

  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) return;
  const file = new File([blob], "pocha-menu-check.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] }).catch(() => {}); // user cancelled
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
