import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { RequestSchema, ResultSchema, type AnalyzeResult } from "@/lib/schema";
import { MENU_SYSTEM_PROMPT, userPrompt } from "@/lib/prompt";
import { MOCK_RESULT } from "@/lib/mock";

export const maxDuration = 60;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const RATE_LIMIT = 10; // requests per IP per minute

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
  const { image, mediaType, restrictions } = body.data;

  const buf = Buffer.from(image, "base64");
  if (buf.length > MAX_IMAGE_BYTES) return fail("too_large", 413);
  if (sniff(buf) !== mediaType) return fail("bad_image", 400);

  if (process.env.MOCK_MODE === "true") {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json(MOCK_RESULT);
  }

  // timeout per attempt keeps two attempts inside maxDuration; we retry ourselves, so SDK retries are off.
  const client = new Anthropic({ timeout: 28_000, maxRetries: 0 });
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await client.messages.parse({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 8000,
        output_config: { effort: "low", format: zodOutputFormat(ResultSchema) },
        system: MENU_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
              { type: "text", text: userPrompt(restrictions) },
            ],
          },
        ],
      });
      if (res.stop_reason === "refusal") return fail("analysis_failed", 502);
      const parsed = ResultSchema.safeParse(res.parsed_output);
      if (parsed.success) return Response.json(parsed.data satisfies AnalyzeResult);
      console.error(`analyze attempt ${attempt}: schema mismatch (stop_reason=${res.stop_reason})`);
    } catch (err) {
      // Log status/class only: never the image or the key.
      const status = err instanceof Anthropic.APIError ? err.status : undefined;
      console.error(`analyze attempt ${attempt}: ${(err as Error).name} ${status ?? ""}`);
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.BadRequestError) break;
    }
  }
  return fail("analysis_failed", 502);
}
