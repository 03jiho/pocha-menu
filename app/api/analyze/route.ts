import { ApiError } from "@google/genai";
import { RESULT_JSON_SCHEMA, RequestSchema, ResultSchema } from "@/lib/schema";
import { SYSTEM_PROMPTS, userPrompt } from "@/lib/prompt";
import { generateJson } from "@/lib/gemini";
import { SAMPLE_RESULT } from "@/lib/sample";

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const RATE_LIMIT = 10; // requests per IP per minute
const BUDGET_MS = 55_000; // stay under maxDuration including the retry

// ponytail: in-memory, per serverless instance. Good enough for a demo; use Upstash/KV if abused.
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

// Magic-byte check so a mislabeled file never reaches the model.
function sniff(buf: Buffer) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 4).toString("hex") === "89504e47") return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip)) return fail("rate_limited", 429);

  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("bad_request", 400);
  const { image, mediaType, restrictions, lang, mode } = body.data;

  const buf = Buffer.from(image, "base64");
  if (buf.length > MAX_IMAGE_BYTES) return fail("too_large", 413);
  if (sniff(buf) !== mediaType) return fail("bad_image", 400);

  if (process.env.MOCK_MODE === "true") {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json(SAMPLE_RESULT);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set (set it, or MOCK_MODE=true)");
    return fail("server_misconfigured", 500);
  }

  const deadline = Date.now() + BUDGET_MS;
  let timedOut = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const left = deadline - Date.now();
    if (left < 10_000) break;
    try {
      const json = await generateJson(
        SYSTEM_PROMPTS[mode],
        [{ inlineData: { mimeType: mediaType, data: image } }, { text: userPrompt(restrictions, lang) }],
        RESULT_JSON_SCHEMA,
        left,
      );
      const parsed = ResultSchema.safeParse(json);
      if (parsed.success) return Response.json(parsed.data);
      console.error(`analyze attempt ${attempt}: schema mismatch`);
    } catch (err) {
      // Log class/status only: never the image or the key.
      const e = err as Error;
      const status = err instanceof ApiError ? err.status : undefined;
      console.error(`analyze attempt ${attempt}: ${e.name} ${status ?? ""}`);
      if (e.name === "TimeoutError" || e.name === "AbortError") timedOut = true;
      if (status === 429) return fail("rate_limited", 429);
      if (status === 401 || status === 403) return fail("server_misconfigured", 500);
      if (status === 400) break; // includes an invalid key; retrying won't help
    }
  }
  return timedOut ? fail("timeout", 504) : fail("analysis_failed", 502);
}
