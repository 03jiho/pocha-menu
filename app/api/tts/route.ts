// Korean read-aloud with ElevenLabs. The client falls back to the browser's own voice on any error, so a missing
// key or an outage never breaks the vendor screen.
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // ElevenLabs premade voice; the multilingual model speaks it in Korean
const MODEL_ID = "eleven_flash_v2_5"; // supports Korean, lowest latency, half the credits of multilingual_v2
const MAX_CHARS = 1000; // a full vendor card is ~500 chars
const RATE_LIMIT = 20; // per IP per minute: protects the free credit pool

// ponytail: in-memory, per serverless instance, same as /api/analyze.
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return fail("tts_unavailable", 501);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (rateLimited(ip)) return fail("rate_limited", 429);

  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = body?.text;
  // Only the app's Korean vendor sentences: must contain Hangul, bounded length.
  if (typeof text !== "string" || !text.trim() || text.length > MAX_CHARS || !/[가-힣]/.test(text)) {
    return fail("bad_request", 400);
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: MODEL_ID, language_code: "ko" }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok || !res.body) {
      console.error(`tts: elevenlabs ${res.status}`); // status only: never the key or the text
      return fail("tts_failed", 502);
    }
    return new Response(res.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch (err) {
    console.error(`tts: ${(err as Error).name}`);
    return fail("tts_failed", 502);
  }
}
