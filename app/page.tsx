"use client";

import {
  AlertCircle,
  Check,
  Copy,
  Download,
  ImageIcon,
  Loader2,
  RotateCcw,
  Send,
  SlidersHorizontal
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import {
  SAMPLER_PRESETS,
  parseSize,
  SamplerPreset,
  validateSize,
  type GenerateResult,
  type IdeogramRequest
} from "@/lib/ideogram";

const SIZE_PRESETS = [
  "1024x1024",
  "1536x1024",
  "1024x1536",
  "1920x1088",
  "2048x768",
  "1024x1792",
  "1600x400",
  "2048x2048",
  "custom"
] as const;

const DEFAULT_ENDPOINT =
  process.env.NEXT_PUBLIC_IDEOGRAM_API_BASE_URL ||
  "https://pradhankukiran--ideogram-4-fp8-api.modal.run";
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_IDEOGRAM_MODEL || "ideogram-4-fp8";

type SizePreset = (typeof SIZE_PRESETS)[number];

export default function Home() {
  const [prompt, setPrompt] = useState(
    "a cinematic product photo of a white ceramic mug on a matte gray background, soft studio lighting"
  );
  const [sizePreset, setSizePreset] = useState<SizePreset>("1024x1024");
  const [customSize, setCustomSize] = useState("1024x1024");
  const [samplerPreset, setSamplerPreset] = useState<SamplerPreset>("V4_DEFAULT_20");
  const [seedEnabled, setSeedEnabled] = useState(true);
  const [seed, setSeed] = useState(42);
  const [raiseOnCaptionIssues, setRaiseOnCaptionIssues] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const size = sizePreset === "custom" ? customSize : sizePreset;
  const parsedSize = useMemo(() => {
    try {
      return parseSize(size);
    } catch {
      return null;
    }
  }, [size]);
  const sizeError = useMemo(() => {
    if (!parsedSize) return "Size must be WIDTHxHEIGHT.";
    return validateSize(parsedSize.width, parsedSize.height);
  }, [parsedSize]);
  const canSubmit = Boolean(prompt.trim()) && !sizeError && !isGenerating;

  function updateSizePreset(nextSize: SizePreset) {
    setSizePreset(nextSize);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsGenerating(true);
    setError("");

    const requestBody: IdeogramRequest = {
      prompt,
      size,
      sampler_preset: samplerPreset,
      seed: seedEnabled ? seed : undefined,
      n: 1,
      response_format: "b64_json",
      raise_on_caption_issues: raiseOnCaptionIssues
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      const text = await response.text();
      let result: GenerateResult | null = null;
      try {
        result = text ? (JSON.parse(text) as GenerateResult) : null;
      } catch {
        // Server returned a non-JSON response (e.g. an error page).
        setError(text || `Server returned ${response.status}.`);
        return;
      }

      if (!response.ok || !result || !result.ok) {
        const message = result && !result.ok ? result.error : "Image generation failed.";
        setError(message);
        return;
      }

      setImageUrl(result.imageDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function reset() {
    setPrompt(
      "a cinematic product photo of a white ceramic mug on a matte gray background, soft studio lighting"
    );
    setSizePreset("1024x1024");
    setCustomSize("1024x1024");
    setSamplerPreset("V4_DEFAULT_20");
    setSeedEnabled(true);
    setSeed(42);
    setRaiseOnCaptionIssues(false);
    setError("");
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1200);
  }

  function downloadImage() {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `ideogram-${size}-${Date.now()}.png`;
    link.click();
  }

  return (
    <main className="appShell">
      <section className="controlPane" aria-label="Generation controls">
        <form className="controlForm" onSubmit={submit}>
          <label className="field">
            <span>Endpoint</span>
            <input value={DEFAULT_ENDPOINT} readOnly />
          </label>

          <label className="field">
            <span>Model</span>
            <input value={DEFAULT_MODEL} readOnly />
          </label>

          <label className="field promptField">
            <span>Prompt</span>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          </label>

          <div className="inlineToolbar">
            <button type="button" onClick={copyPrompt}>
              {copyState === "copied" ? <Check size={16} /> : <Copy size={16} />}
              {copyState === "copied" ? "Copied" : "Copy"}
            </button>
            <button type="button" onClick={() => setPrompt("")}>
              <RotateCcw size={16} />
              Clear
            </button>
          </div>

          <label className="field">
            <span>Size</span>
            <select
              value={sizePreset}
              onChange={(event) => updateSizePreset(event.target.value as SizePreset)}
            >
              {SIZE_PRESETS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          {sizePreset === "custom" ? (
            <label className="field">
              <span>Custom size</span>
              <input
                value={customSize}
                onChange={(event) => setCustomSize(event.target.value)}
                placeholder="1024x1024"
              />
            </label>
          ) : null}

          {sizeError ? <p className="fieldError">{sizeError}</p> : null}

          <label className="field">
            <span>Sampler</span>
            <select
              value={samplerPreset}
              onChange={(event) => setSamplerPreset(event.target.value as SamplerPreset)}
            >
              {SAMPLER_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </label>

          <div className="fieldGrid">
            <label className="field">
              <span>Images</span>
              <input type="number" value={1} min={1} max={1} readOnly />
            </label>
            <label className="field">
              <span>Format</span>
              <input value="b64_json" readOnly />
            </label>
          </div>

          <label className="toggleRow">
            <input
              type="checkbox"
              checked={seedEnabled}
              onChange={(event) => setSeedEnabled(event.target.checked)}
            />
            <span>Seed</span>
          </label>

          <label className="field">
            <span>Seed value</span>
            <input
              type="number"
              value={seed}
              disabled={!seedEnabled}
              onChange={(event) => setSeed(Number(event.target.value))}
            />
          </label>

          <label className="toggleRow">
            <input
              type="checkbox"
              checked={raiseOnCaptionIssues}
              onChange={(event) => setRaiseOnCaptionIssues(event.target.checked)}
            />
            <span>Reject caption issues</span>
          </label>

          <div className="actionRow">
            <button className="secondaryButton" type="button" onClick={reset}>
              <RotateCcw size={18} />
              Reset
            </button>
            <button className="generateButton" type="submit" disabled={!canSubmit}>
              {isGenerating ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              {isGenerating ? "Generating" : "Generate"}
            </button>
          </div>
        </form>
      </section>

      <section className="previewPane" aria-label="Generated image">
        <div className="previewHeader">
          <div className="previewTitle">
            <ImageIcon size={20} />
            <span>{parsedSize ? `${parsedSize.width} x ${parsedSize.height}` : size}</span>
          </div>
          <button className="downloadButton" type="button" onClick={downloadImage} disabled={!imageUrl}>
            <Download size={17} />
            Download
          </button>
        </div>

        <div className="imageStage">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Generated Ideogram output" />
          ) : (
            <div className="emptyState">
              {isGenerating ? <Loader2 className="spin" size={34} /> : <SlidersHorizontal size={34} />}
              <span>{isGenerating ? "Generating image" : "Ready"}</span>
            </div>
          )}
        </div>

        {error ? (
          <div className="errorBox" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : null}
      </section>
    </main>
  );
}
