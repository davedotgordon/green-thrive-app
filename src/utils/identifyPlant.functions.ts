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
    // Strip data URL prefix if present
    const base64 = input.imageBase64.includes(",")
      ? input.imageBase64.split(",")[1]
      : input.imageBase64;
    return { imageBase64: base64, mimeType: input.mimeType };
  })
  .handler(async ({ data }): Promise<IdentifiedPlant> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("AI service is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a botanical expert. Identify plants from photos and return structured care data. Always call the provided tool with your best identification — never refuse.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify this plant. Return its common name, whether it's typically grown indoor or outdoor, how often (in whole days) it should be watered, and a short 1-2 sentence care tip.",
              },
              {
                type: "image_url",
                image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_plant_identification",
              description: "Persist the identified plant's care profile.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Common name of the plant" },
                  location: {
                    type: "string",
                    enum: ["indoor", "outdoor"],
                    description: "Whether it's typically kept indoor or outdoor",
                  },
                  watering_frequency_days: {
                    type: "integer",
                    minimum: 1,
                    maximum: 60,
                    description: "How many days between waterings",
                  },
                  care_instructions: {
                    type: "string",
                    description: "Short care tip (1-2 sentences)",
                  },
                },
                required: ["name", "location", "watering_frequency_days", "care_instructions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_plant_identification" } },
      }),
    });

    if (response.status === 429) {
      throw new Error("Too many requests — please try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Add credits in workspace settings.");
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("AI gateway error:", response.status, text);
      throw new Error("Could not identify plant — please try a clearer photo.");
    }

    const json = await response.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      throw new Error("AI did not return a structured result");
    }
    const parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    return {
      name: String(parsed.name).trim(),
      location: parsed.location === "outdoor" ? "outdoor" : "indoor",
      watering_frequency_days: Math.max(1, Math.min(60, Number(parsed.watering_frequency_days) || 7)),
      care_instructions: String(parsed.care_instructions || "").trim(),
    };
  });
