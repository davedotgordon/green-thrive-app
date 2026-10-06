import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Admin = SupabaseClient<Database>;

export const RAIN_DELAY_INCHES = 0.25;
const COLD_LOOKAHEAD_DAYS = 4; // today + next 3 days
const WARM_LOOKAHEAD_DAYS = 7;
const WARM_BUFFER_F = 5;

export interface ForecastDay {
  date: string;
  low: number;
  high: number;
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekday(iso: string) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

async function fetchWeather(zip: string) {
  // Zippopotam handles every US ZIP; Open-Meteo's name search misses many.
  let r: { latitude: number; longitude: number; name: string | null } | null = null;
  const zRes = await fetch(`https://api.zippopotam.us/us/${zip}`);
  if (zRes.ok) {
    const z = await zRes.json();
    const pl = z?.places?.[0];
    if (pl) r = { latitude: Number(pl.latitude), longitude: Number(pl.longitude), name: pl["place name"] ?? null };
  }
  if (!r) {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${zip}&country=US&count=1&language=en&format=json`,
    );
    const g = geoRes.ok ? (await geoRes.json())?.results?.[0] : null;
    if (g) r = { latitude: g.latitude, longitude: g.longitude, name: g.name ?? null };
  }
  if (!r) throw new Error(`Could not locate ZIP ${zip}`);

  const wxRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${r.latitude}&longitude=${r.longitude}` +
      `&hourly=precipitation&daily=temperature_2m_min,temperature_2m_max` +
      `&precipitation_unit=inch&temperature_unit=fahrenheit&past_days=1&forecast_days=14&timezone=auto`,
  );
  if (!wxRes.ok) throw new Error(`Weather lookup failed (${wxRes.status})`);
  const wx = await wxRes.json();

  const times: string[] = wx?.hourly?.time ?? [];
  const precips: number[] = wx?.hourly?.precipitation ?? [];
  const offsetSec: number = wx?.utc_offset_seconds ?? 0;
  const now = Date.now();
  const cutoff = now - 24 * 3600 * 1000;
  let rain = 0;
  for (let i = 0; i < times.length; i++) {
    // Open-Meteo local times have no zone; convert using the returned offset
    const ts = new Date(times[i] + "Z").getTime() - offsetSec * 1000;
    if (ts >= cutoff && ts <= now) rain += Number(precips[i]) || 0;
  }

  const dates: string[] = wx?.daily?.time ?? [];
  const lows: number[] = wx?.daily?.temperature_2m_min ?? [];
  const highs: number[] = wx?.daily?.temperature_2m_max ?? [];
  const forecast: ForecastDay[] = dates.map((d, i) => ({
    date: d,
    low: Math.round(Number(lows[i])),
    high: Math.round(Number(highs[i])),
  }));

  return { city: (r.name as string) ?? null, rain: Math.round(rain * 100) / 100, forecast };
}

/** Ask Gemini for the minimum safe overnight temperature (°F) for each plant name. */
async function estimateMinTemps(names: string[]): Promise<Record<string, number>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || names.length === 0) return {};
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "For each plant, give the lowest overnight outdoor temperature in °F it can safely tolerate before it should be brought indoors (container plant). Plants:\n" +
                  names.map((n) => `- ${n}`).join("\n"),
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, min_temp_f: { type: "integer" } },
              required: ["name", "min_temp_f"],
            },
          },
        },
      }),
    },
  );
  if (!res.ok) {
    console.error("Gemini min temp error", res.status, await res.text().catch(() => ""));
    return {};
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  try {
    const arr = JSON.parse(text) as { name: string; min_temp_f: number }[];
    const out: Record<string, number> = {};
    for (const a of arr) out[a.name] = Math.max(-30, Math.min(70, Math.round(a.min_temp_f)));
    return out;
  } catch {
    return {};
  }
}

/** Daily per-family weather pass: rain delays, cold tolerance, move suggestions. */
export async function runFamilyWeather(admin: Admin, familyId: string, zip: string, today: string) {
  const { city, rain, forecast } = await fetchWeather(zip);

  const { data: plants } = await admin
    .from("plants")
    .select("id, name, exposure, outdoor_exposure, min_temp_f, rain_delay_until")
    .is("archived_at", null)
    .eq("family_id", familyId);
  const list = plants ?? [];

  // 1. Rain delay — outdoor plants only
  if (rain >= RAIN_DELAY_INCHES) {
    const until = addDays(today, 2);
    const ids = list
      .filter((p) => p.exposure === "outdoor" && (!p.rain_delay_until || p.rain_delay_until < until))
      .map((p) => p.id);
    if (ids.length) await admin.from("plants").update({ rain_delay_until: until }).in("id", ids);
  }

  // 2. Fill in cold tolerance for plants that don't have one yet
  const missing = list.filter((p) => p.min_temp_f == null);
  if (missing.length) {
    const est = await estimateMinTemps([...new Set(missing.map((p) => p.name))]);
    for (const p of missing) {
      const v = est[p.name];
      if (v != null) {
        p.min_temp_f = v;
        await admin.from("plants").update({ min_temp_f: v }).eq("id", p.id);
      }
    }
  }

  // 3. Move suggestions
  const upcoming = forecast.filter((d) => d.date >= today);
  const cold = upcoming.slice(0, COLD_LOOKAHEAD_DAYS);
  const warm = upcoming.slice(0, WARM_LOOKAHEAD_DAYS);
  for (const p of list) {
    if (p.min_temp_f == null) continue;
    let suggestion: "indoor" | "outdoor" | null = null;
    let reason: string | null = null;
    if (p.exposure !== "indoor") {
      const hit = cold.find((d) => d.low < p.min_temp_f!);
      if (hit) {
        suggestion = "indoor";
        reason = `Low of ${hit.low}°F on ${weekday(hit.date)} — below its ${p.min_temp_f}°F limit`;
      }
    } else if (p.outdoor_exposure && warm.length >= WARM_LOOKAHEAD_DAYS) {
      const coldest = Math.min(...warm.map((d) => d.low));
      if (coldest >= p.min_temp_f + WARM_BUFFER_F) {
        suggestion = "outdoor";
        reason = `Lows stay at ${coldest}°F or warmer all week — safe to go back out`;
      }
    }
    await admin
      .from("plants")
      .update({
        move_suggestion: suggestion,
        move_reason: reason,
        move_suggested_date: suggestion ? today : null,
      })
      .eq("id", p.id);
  }

  await admin.from("family_weather").upsert({
    family_id: familyId,
    checked_date: today,
    city,
    rainfall_24h: rain,
    forecast: forecast as unknown as Database["public"]["Tables"]["family_weather"]["Insert"]["forecast"],
    updated_at: new Date().toISOString(),
  });
}
