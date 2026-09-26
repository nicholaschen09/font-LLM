import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const fallbackModel = "gemini-2.5-flash";

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

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? fallbackModel,
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

  const text = response.text ?? "";

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json(
      { error: "The model returned an invalid analysis response." },
      { status: 502 }
    );
  }
}
