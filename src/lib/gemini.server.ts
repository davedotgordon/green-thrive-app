/**
 * Shared Gemini caller. Primary model is gemini-3.5-flash; on transient
 * overload/rate-limit responses we retry once with gemini-flash-lite-latest.
 */
const MODELS = ["gemini-3.5-flash", "gemini-flash-lite-latest"];
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export async function callGemini(body: unknown): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  let last: Response | null = null;
  for (const model of MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (res.ok || !RETRYABLE.has(res.status)) return res;
    console.warn(`[gemini] ${model} returned ${res.status}; trying fallback model`);
    last = res;
  }
  return last as Response;
}
