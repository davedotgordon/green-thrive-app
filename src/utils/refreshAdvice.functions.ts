import { createServerFn } from "@tanstack/react-start";

interface Input {
  name: string;
  city?: string | null;
  exposure?: "indoor" | "porch" | "outdoor" | null;
  pot_size?: "small" | "medium" | "large" | null;
  establishment_level?: "infant" | "young" | "mature" | "unsure" | null;
}

export const refreshAdvice = createServerFn({ method: "POST" })
  .inputValidator((input: Input) => {
    if (!input?.name || typeof input.name !== "string") {
      throw new Error("Plant name is required");
    }
    return {
      name: input.name.trim(),
      city: input.city ?? null,
      exposure: input.exposure ?? null,
      pot_size: input.pot_size ?? null,
      establishment_level: input.establishment_level ?? null,
    };
  })
  .handler(async ({ data }): Promise<{ care_instructions: string }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const model = "gemini-flash-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const cityCtx = data.city ? `the user's location: ${data.city}` : "a generic temperate-humid US climate";
    const ctxBits = [
      data.exposure ? `living ${data.exposure}` : null,
      data.pot_size ? `in a ${data.pot_size} pot` : null,
      data.establishment_level && data.establishment_level !== "unsure"
        ? `${data.establishment_level} stage`
        : null,
    ]
      .filter(Boolean)
      .join(", ");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `You are a botanical expert calibrated for ${cityCtx}. Give practical care advice tuned to this plant and its environment. Be concise (2-3 sentences) and specific (light, soil, signs of distress). Never refuse.`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Plant: ${data.name}${ctxBits ? ` (${ctxBits})` : ""}. Give a 2-3 sentence locally-tuned care tip for ${cityCtx}.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: { care_instructions: { type: "string" } },
            required: ["care_instructions"],
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Gemini refreshAdvice error:", response.status, text);
      throw new Error("Could not fetch advice — try again in a moment.");
    }

    const json = await response.json();
    const textOut: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOut) throw new Error("AI did not return advice");
    let parsed: { care_instructions?: string };
    try {
      parsed = JSON.parse(textOut);
    } catch {
      throw new Error("AI returned invalid data");
    }
    const care = String(parsed.care_instructions || "").trim();
    if (!care) throw new Error("AI returned empty advice");
    return { care_instructions: care };
  });
