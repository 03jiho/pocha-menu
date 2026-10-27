// TEMPORARY diagnostic: minimal Gemini call to separate auth/connectivity from image/schema slowness. Remove after use.
import { ApiError, GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/gemini";

export const maxDuration = 60;

const FREE_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"];

export async function GET(req: Request) {
  const asked = new URL(req.url).searchParams.get("model") ?? "";
  const model = FREE_MODELS.includes(asked) ? asked : GEMINI_MODEL;
  const key = process.env.GEMINI_API_KEY ?? "";
  const t0 = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const res = await ai.models.generateContent({
      model,
      contents: "Reply with the single word OK.",
      config: { abortSignal: AbortSignal.timeout(25_000), httpOptions: { retryOptions: { attempts: 1 } } },
    });
    return Response.json({ ok: true, ms: Date.now() - t0, model, text: res.text?.slice(0, 20) });
  } catch (err) {
    const e = err as Error;
    return Response.json({
      ok: false,
      ms: Date.now() - t0,
      model,
      keyShape: { length: key.length, prefix: key.slice(0, 3) },
      name: e.name,
      status: err instanceof ApiError ? err.status : undefined,
      message: e.message.replaceAll(key, "[key]").slice(0, 300),
    });
  }
}
