"use client";

import { DragEvent, FormEvent, useMemo, useState } from "react";

type FontMatch = {
  family: string;
  confidence: number;
  evidence: string[];
  alternatives: string[];
};

type AnalysisResult = {
  summary: string;
  matches: FontMatch[];
  imageQuality: string;
  nextSteps: string[];
};

type AnalysisErrorPayload = {
  error?: string;
  attempts?: Array<{
    model: string;
    status?: number;
    message: string;
  }>;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const canSubmit = useMemo(() => Boolean(file) && !isLoading, [file, isLoading]);

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
    setError("");

    if (!nextFile) {
      setPreviewUrl("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(String(reader.result ?? ""));
    reader.readAsDataURL(nextFile);
  }

  function selectImage(nextFile: File | null) {
    if (nextFile && !nextFile.type.startsWith("image/")) {
      setFile(null);
      setResult(null);
      setPreviewUrl("");
      setError("Drop an image file.");
      return;
    }

    handleFileChange(nextFile);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectImage(event.dataTransfer.files[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/analyze-font", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();

      if (!response.ok) {
        const errorPayload = payload as AnalysisErrorPayload;
        const attemptedModels = errorPayload.attempts
          ?.map((attempt) => `${attempt.model}${attempt.status ? ` (${attempt.status})` : ""}`)
          .join(", ");

        throw new Error(
          attemptedModels
            ? `${errorPayload.error ?? "Font analysis failed."} Tried: ${attemptedModels}.`
            : errorPayload.error ?? "Font analysis failed."
        );
      }

      setResult(payload);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Something went wrong during font analysis."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="intro">
          <p className="eyebrow">font-LLM</p>
          <h1>Identify fonts from images</h1>
          <p>
            Upload typography from a screenshot, logo, poster, or photo. The app
            uses an LLM vision prompt to return ranked font guesses and the visual
            evidence behind them.
          </p>
        </div>

        <form className="upload-panel" onSubmit={handleSubmit}>
          <label
            className={`drop-zone${isDragging ? " is-dragging" : ""}`}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              accept="image/png,image/jpeg,image/webp"
              type="file"
              onChange={(event) => selectImage(event.target.files?.[0] ?? null)}
            />
            <span>
              {file ? file.name : isDragging ? "Drop image here" : "Choose or drop an image"}
            </span>
            <small>PNG, JPG, or WebP with visible text</small>
          </label>

          {previewUrl ? (
            <div className="preview-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Uploaded typography preview" src={previewUrl} />
            </div>
          ) : (
            <div className="empty-preview">Image preview</div>
          )}

          <button disabled={!canSubmit} type="submit">
            {isLoading ? "Analyzing..." : "Analyze font"}
          </button>

          {error ? <p className="error">{error}</p> : null}
        </form>
      </section>

      <section className="results" aria-live="polite">
        {result ? (
          <>
            <div className="result-header">
              <p className="eyebrow">Analysis</p>
              <h2>{result.summary}</h2>
              <p>{result.imageQuality}</p>
            </div>

            <div className="match-list">
              {result.matches.map((match) => (
                <article className="match-card" key={match.family}>
                  <div>
                    <h3>{match.family}</h3>
                    <p>{Math.round(match.confidence * 100)}% confidence</p>
                  </div>
                  <ul>
                    {match.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="alternatives">
                    Similar alternatives: {match.alternatives.join(", ")}
                  </p>
                </article>
              ))}
            </div>

            <div className="next-steps">
              <h3>Next steps</h3>
              <ul>
                {result.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="placeholder">
            <p className="eyebrow">Ready</p>
            <h2>Your font matches will appear here.</h2>
            <p>
              For best results, crop close to the letters and include several
              characters from the same type style.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
