// TEMPORARY diagnostic: minimal Gemini call to separate auth/connectivity from image/schema slowness. Remove after use.
import { ApiError, GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/gemini";

export const maxDuration = 60;

export async function GET() {
  const key = process.env.GEMINI_API_KEY ?? "";
  const t0 = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: "Reply with the single word OK.",
      config: { abortSignal: AbortSignal.timeout(25_000), httpOptions: { retryOptions: { attempts: 1 } } },
    });
    return Response.json({ ok: true, ms: Date.now() - t0, model: GEMINI_MODEL, text: res.text?.slice(0, 20) });
  } catch (err) {
    const e = err as Error;
    return Response.json({
      ok: false,
      ms: Date.now() - t0,
      model: GEMINI_MODEL,
      keyShape: { length: key.length, prefix: key.slice(0, 3) },
      name: e.name,
      status: err instanceof ApiError ? err.status : undefined,
      message: e.message.replaceAll(key, "[key]").slice(0, 300),
    });
  }
}
