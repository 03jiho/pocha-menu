import { GoogleGenAI, type Part } from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

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
      abortSignal: AbortSignal.timeout(timeoutMs),
    },
  });
  const text = res.text;
  if (!text) {
    const why = res.promptFeedback?.blockReason ?? res.candidates?.[0]?.finishReason ?? "unknown";
    throw new Error(`empty response (${why})`);
  }
  return JSON.parse(text) as unknown;
}
