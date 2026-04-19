import { createServerFn } from "@tanstack/react-start";

export interface IdentifiedPlant {
  name: string;
  location: "indoor" | "outdoor";
  watering_frequency_days: number;
  care_instructions: string;
  pot_size: "small" | "medium" | "large";
  establishment_level: "infant" | "young" | "mature" | "unsure";
}

interface Input {
  imageBase64: string;
  mimeType: string;
  city?: string | null;
}

export const identifyPlant = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => {
    if (!input?.imageBase64 || typeof input.imageBase64 !== "string") {
      throw new Error("imageBase64 is required");
    }
    if (!input?.mimeType || !input.mimeType.startsWith("image/")) {
      throw new Error("Valid image mimeType is required");
    }
    const base64 = input.imageBase64.includes(",")
      ? input.imageBase64.split(",")[1]
      : input.imageBase64;
    return { imageBase64: base64, mimeType: input.mimeType, city: input.city ?? null };
  })
  .handler(async ({ data }): Promise<IdentifiedPlant> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const model = "gemini-flash-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const cityCtx = data.city
      ? `the user's location: ${data.city}`
      : "a generic temperate-humid US climate";

    console.log("[identifyPlant] incoming image", {
      mimeType: data.mimeType,
      base64Length: data.imageBase64.length,
      city: data.city,
      model,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `You are a botanical expert calibrated for ${cityCtx}. Identify the plant in the image and return care information as structured JSON. Always provide your best identification — never refuse. Visually estimate pot size and the plant's apparent age/establishment from the photo. Factor pot size, plant age, and the user's local climate into your recommended baseline watering frequency.`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Identify this plant. Return its common name, indoor/outdoor preference for ${cityCtx}, baseline watering frequency in whole days, a 1-2 sentence locally-tuned care tip, an estimated pot size (small/medium/large) based on the visible container, and an establishment level (infant for seedlings, young for juveniles, mature for full-grown, or unsure if you cannot tell).`,
              },
              {
                inlineData: {
                  mimeType: data.mimeType,
                  data: data.imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              name: { type: "string" },
              location: { type: "string", enum: ["indoor", "outdoor"] },
              watering_frequency_days: { type: "integer" },
              care_instructions: { type: "string" },
              pot_size: { type: "string", enum: ["small", "medium", "large"] },
              establishment_level: {
                type: "string",
                enum: ["infant", "young", "mature", "unsure"],
              },
            },
            required: [
              "name",
              "location",
              "watering_frequency_days",
              "care_instructions",
              "pot_size",
              "establishment_level",
            ],
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Gemini API error:", response.status, text);
      let detail = "";
      try {
        const j = JSON.parse(text);
        detail = j?.error?.message || "";
      } catch {
        /* ignore */
      }
      if (response.status === 429) {
        throw new Error("Too many requests — please try again in a moment.");
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error("Invalid Gemini API key. Please check your configuration.");
      }
      if (response.status === 404) {
        throw new Error(
          `Gemini model not available for your key (${detail || "404"}). Falling back to manual entry.`,
        );
      }
      throw new Error(
        detail
          ? `Gemini error: ${detail}`
          : "Could not identify plant — please try a clearer photo.",
      );
    }

    const json = await response.json();
    const candidate = json?.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const textOut: string | undefined = candidate?.content?.parts?.[0]?.text;
    if (!textOut) {
      console.error(
        "Gemini returned no content:",
        finishReason,
        JSON.stringify(json).slice(0, 500),
      );
      if (finishReason === "MAX_TOKENS" || finishReason === "SAFETY") {
        throw new Error("AI couldn't read this photo — please enter details manually.");
      }
      throw new Error("AI did not return a result — please enter details manually.");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(textOut);
    } catch {
      throw new Error("AI returned invalid data");
    }

    const validPot = ["small", "medium", "large"];
    const validEst = ["infant", "young", "mature", "unsure"];

    return {
      name: String(parsed.name || "Unknown plant").trim(),
      location: parsed.location === "outdoor" ? "outdoor" : "indoor",
      watering_frequency_days: Math.max(
        1,
        Math.min(60, Number(parsed.watering_frequency_days) || 7),
      ),
      care_instructions: String(parsed.care_instructions || "").trim(),
      pot_size: validPot.includes(parsed.pot_size) ? parsed.pot_size : "medium",
      establishment_level: validEst.includes(parsed.establishment_level)
        ? parsed.establishment_level
        : "unsure",
    };
  });
