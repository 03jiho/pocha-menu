import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// One structured-output call. Returns the parsed JSON; the caller validates it with zod.
export async function generateJson(system: string, parts: Part[], jsonSchema: unknown, timeoutMs: number) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
      maxOutputTokens: 8192,
      // Low thinking keeps latency well inside the 55s route budget.
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      abortSignal: AbortSignal.timeout(timeoutMs),
      // SDK default is 5 attempts with backoff on 408/429/5xx, which burned the whole budget and hid
      // the real status behind an AbortError. The route retries once itself.
      httpOptions: { retryOptions: { attempts: 1 } },
    },
  });
  const text = res.text;
  if (!text) {
    const why = res.promptFeedback?.blockReason ?? res.candidates?.[0]?.finishReason ?? "unknown";
    throw new Error(`empty response (${why})`);
  }
  return JSON.parse(text) as unknown;
}
