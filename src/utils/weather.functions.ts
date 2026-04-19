import { createServerFn } from "@tanstack/react-start";

export interface WeatherSummary {
  rainfallInchesLast24h: number;
  city: string | null;
  fetchedAt: string;
}

interface Input {
  zip: string;
}

/**
 * Open-Meteo: free, no API key needed.
 * 1) Geocode US ZIP via open-meteo geocoding API
 * 2) Fetch past 24h precipitation from forecast API (past_days=1)
 */
export const getWeatherForZip = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => {
    const zip = String(input?.zip || "").trim();
    if (!/^\d{5}$/.test(zip)) {
      throw new Error("ZIP must be a 5-digit US postal code");
    }
    return { zip };
  })
  .handler(async ({ data }): Promise<WeatherSummary> => {
    // Open-Meteo geocoding supports postal codes via `name=<zip>` and `country=US`
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${data.zip}&country=US&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) {
      throw new Error(`Geocoding failed (${geoRes.status})`);
    }
    const geo = await geoRes.json();
    const result = geo?.results?.[0];
    if (!result) {
      throw new Error(`Could not locate ZIP ${data.zip}`);
    }
    const { latitude, longitude, name } = result;

    // Fetch past 24h hourly precipitation (inches)
    const wxUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&hourly=precipitation&precipitation_unit=inch&past_days=1&forecast_days=1&timezone=auto`;
    const wxRes = await fetch(wxUrl);
    if (!wxRes.ok) {
      throw new Error(`Weather lookup failed (${wxRes.status})`);
    }
    const wx = await wxRes.json();
    const times: string[] = wx?.hourly?.time ?? [];
    const precips: number[] = wx?.hourly?.precipitation ?? [];

    // Sum precipitation for the past 24 hours from "now"
    const nowMs = Date.now();
    const cutoffMs = nowMs - 24 * 60 * 60 * 1000;
    let total = 0;
    for (let i = 0; i < times.length; i++) {
      const ts = new Date(times[i]).getTime();
      if (ts >= cutoffMs && ts <= nowMs) {
        total += Number(precips[i]) || 0;
      }
    }

    return {
      rainfallInchesLast24h: Math.round(total * 100) / 100,
      city: name ?? null,
      fetchedAt: new Date().toISOString(),
    };
  });
