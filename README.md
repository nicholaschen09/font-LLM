# font-LLM

FontLens is a prototype product for identifying fonts from images with an LLM vision model. Upload a screenshot, poster, logo, or photo of typography and get ranked font matches, visual reasoning, and suggested alternatives.

## Product Idea

Designers, founders, and brand teams often see typography in the wild and want to know what it is. Traditional font matchers rely on glyph extraction and curated databases. FontLens starts with an LLM vision workflow that can reason about typography in messy real-world images, then can grow into a hybrid system with OCR, glyph matching, and font metadata.

## MVP Flow

1. Upload an image containing text.
2. The app sends the image to an LLM with vision support.
3. The model returns:
   - Likely font family matches
   - Confidence scores
   - Visual evidence, such as x-height, serifs, terminals, contrast, and spacing
   - Similar free or commercial alternatives
   - Suggested next steps if the image is too noisy

## Tech Stack

- Next.js App Router
- TypeScript
- Gemini API with a vision-capable model
- CSS Modules-free global styling for a compact prototype

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your Gemini API key:

```bash
GEMINI_API_KEY=your_api_key_here
```

Open `http://localhost:3000`.
