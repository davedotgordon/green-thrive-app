import { createServerFn } from "@tanstack/react-start";

export interface Recalibration {
  watering_frequency_days: number;
  watering_volume_ml: number;
  rationale: string;
}

interface Input {
  name: string;
  exposure: "indoor" | "porch" | "outdoor";
  pot_size: "small" | "medium" | "large";
  establishment_level: "infant" | "young" | "mature" | "unsure";
  city?: string | null;
}

/**
 * Use Gemini to recalibrate watering for a plant when its environment changes.
 * Falls back to descriptive error so callers can keep the local heuristic.
 */
export const recalibratePlant = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => {
    if (!input?.name) throw new Error("Plant name is required");
    return {
      name: String(input.name).trim(),
      exposure: input.exposure,
      pot_size: input.pot_size,
      establishment_level: input.establishment_level,
      city: input.city ?? null,
    };
  })
  .handler(async ({ data }): Promise<Recalibration> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const model = "gemini-flash-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const cityCtx = data.city
      ? `the user's city: ${data.city}`
      : "a generic temperate-humid US climate";

    const exposureLabel =
      data.exposure === "indoor"
        ? "kept indoors"
        : data.exposure === "porch"
          ? "on a covered porch (sheltered from rain)"
          : "fully outdoors and exposed to rain & sun";

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `You are a botanical irrigation expert. Recalibrate watering volume (in milliliters) and frequency (in whole days) for a plant when given its species, pot size, plant age, environment, and city. Factor pot size, plant age, and the local climate (humidity, temperature, sun exposure). Return concise structured JSON only.`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Plant: ${data.name}\nPot size: ${data.pot_size}\nPlant age: ${data.establishment_level}\nEnvironment: ${exposureLabel}\nLocation: ${cityCtx}\n\nReturn the recommended watering volume in milliliters and frequency in whole days, plus a one-sentence rationale.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              watering_frequency_days: { type: "integer" },
              watering_volume_ml: { type: "integer" },
              rationale: { type: "string" },
            },
            required: ["watering_frequency_days", "watering_volume_ml", "rationale"],
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Gemini recalibrate error:", response.status, text);
      throw new Error("Could not recalibrate — please try again.");
    }

    const json = await response.json();
    const textOut: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOut) throw new Error("AI did not return a result");

    let parsed: any;
    try {
      parsed = JSON.parse(textOut);
    } catch {
      throw new Error("AI returned invalid data");
    }

    return {
      watering_frequency_days: Math.max(
        1,
        Math.min(30, Number(parsed.watering_frequency_days) || 7),
      ),
      watering_volume_ml: Math.max(
        50,
        Math.min(8000, Number(parsed.watering_volume_ml) || 300),
      ),
      rationale: String(parsed.rationale || "").trim(),
    };
  });
