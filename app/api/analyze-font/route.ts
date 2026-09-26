import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const defaultModelWaterfall = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash"
];

function getModelWaterfall() {
  const configuredModels = process.env.GEMINI_MODEL_WATERFALL ?? process.env.GEMINI_MODEL;

  if (!configuredModels) {
    return defaultModelWaterfall;
  }

  const preferredModels = configuredModels
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return Array.from(new Set([...preferredModels, ...defaultModelWaterfall]));
}

function getErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return { message: "Unknown error" };
  }

  return {
    message: error.message,
    status: "status" in error ? error.status : undefined
  };
}

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY. Add it to .env.local first." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Upload an image file." }, { status: 400 });
  }

  if (!image.type.startsWith("image/")) {
    return NextResponse.json({ error: "The uploaded file must be an image." }, { status: 400 });
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = getModelWaterfall();
  const attempts: Array<{ model: string; status?: unknown; message: string }> = [];
  let text = "";

  for (const model of models) {
    try {
      console.info(`Trying Gemini model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "You are a typography expert. Analyze the typography in this image. Identify likely font families, be honest about uncertainty, and cite visual evidence such as x-height, serifs, terminals, contrast, counters, spacing, and letterform proportions."
              },
              {
                inlineData: {
                  mimeType: image.type,
                  data: bytes.toString("base64")
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            propertyOrdering: ["summary", "imageQuality", "matches", "nextSteps"],
            required: ["summary", "imageQuality", "matches", "nextSteps"],
            properties: {
              summary: { type: Type.STRING },
              imageQuality: { type: Type.STRING },
              matches: {
                type: Type.ARRAY,
                minItems: "1",
                maxItems: "5",
                items: {
                  type: Type.OBJECT,
                  propertyOrdering: ["family", "confidence", "evidence", "alternatives"],
                  required: ["family", "confidence", "evidence", "alternatives"],
                  properties: {
                    family: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                    evidence: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    alternatives: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  }
                }
              },
              nextSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          }
        }
      });

      text = response.text ?? "";
      console.info(`Gemini model succeeded: ${model}`);
      break;
    } catch (error) {
      const details = getErrorDetails(error);
      attempts.push({ model, ...details });
      console.warn(`Gemini model failed: ${model}`, details);
    }
  }

  if (!text) {
    console.error("Gemini model waterfall failed.", attempts);
    return NextResponse.json(
      {
        error: "Font analysis failed across all configured Gemini models.",
        attempts
      },
      { status: 502 }
    );
  }

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json(
      { error: "The model returned an invalid analysis response." },
      { status: 502 }
    );
  }
}
