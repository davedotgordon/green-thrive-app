import { createServerFn } from "@tanstack/react-start";

export interface IdentifiedPlant {
  name: string;
  location: "indoor" | "outdoor";
  watering_frequency_days: number;
  care_instructions: string;
}

interface Input {
  imageBase64: string; // data URL or raw base64
  mimeType: string;
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
    return { imageBase64: base64, mimeType: input.mimeType };
  })
  .handler(async ({ data }): Promise<IdentifiedPlant> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are a botanical expert. Identify the plant in the image and return care information as structured JSON. Always provide your best identification — never refuse.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Identify this plant. Return its common name, whether it's typically grown indoor or outdoor, how often (in whole days) it should be watered, and a short 1-2 sentence care tip.",
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
            },
            required: ["name", "location", "watering_frequency_days", "care_instructions"],
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Gemini API error:", response.status, text);
      if (response.status === 429) {
        throw new Error("Too many requests — please try again in a moment.");
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error("Invalid Gemini API key. Please check your configuration.");
      }
      throw new Error("Could not identify plant — please try a clearer photo.");
    }

    const json = await response.json();
    const textOut: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOut) {
      console.error("Gemini returned no content:", JSON.stringify(json).slice(0, 500));
      throw new Error("AI did not return a result");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(textOut);
    } catch {
      throw new Error("AI returned invalid data");
    }

    return {
      name: String(parsed.name || "Unknown plant").trim(),
      location: parsed.location === "outdoor" ? "outdoor" : "indoor",
      watering_frequency_days: Math.max(
        1,
        Math.min(60, Number(parsed.watering_frequency_days) || 7),
      ),
      care_instructions: String(parsed.care_instructions || "").trim(),
    };
  });
