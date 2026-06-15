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
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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

const EXAMPLE_PROMPTS = [
  "a cinematic product photo of a white ceramic mug on a matte gray background, soft studio lighting",
  "an isometric illustration of a tiny city floating in the clouds",
  "a ginger cat wearing a tiny wizard hat reading a spellbook",
  "a minimalist logo for a coffee brand, earth tones, flat vector style",
  "a futuristic neon street in tokyo at night, rain reflections, cyberpunk"
];

const DEFAULT_ENDPOINT =
  process.env.NEXT_PUBLIC_IDEOGRAM_API_BASE_URL ||
  "https://pradhankukiran--ideogram-4-fp8-api.modal.run";
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_IDEOGRAM_MODEL || "ideogram-4-fp8";

type SizePreset = (typeof SIZE_PRESETS)[number];

type GenerationMeta = {
  seed: number;
  size: string;
  sampler: SamplerPreset;
  elapsedMs: number;
} | null;

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [sizePreset, setSizePreset] = useState<SizePreset>("1024x1024");
  const [customSize, setCustomSize] = useState("1024x1024");
  const [samplerPreset, setSamplerPreset] = useState<SamplerPreset>("V4_DEFAULT_20");
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [meta, setMeta] = useState<GenerationMeta>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const startTimeRef = useRef<number>(0);

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

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isGenerating) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isGenerating]);

  useEffect(() => {
    const el = promptRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [prompt]);

  function updateSizePreset(nextSize: SizePreset) {
    setSizePreset(nextSize);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsGenerating(true);
    setError("");
    startTimeRef.current = performance.now();

    const requestBody: IdeogramRequest = {
      prompt,
      size,
      sampler_preset: samplerPreset,
      seed,
      n: 1,
      response_format: "b64_json"
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
        setError(text || `Server returned ${response.status}.`);
        return;
      }

      if (!response.ok || !result || !result.ok) {
        const message = result && !result.ok ? result.error : "Image generation failed.";
        setError(message);
        return;
      }

      setImageUrl(result.imageDataUrl);
      setSeed(result.seed);
      setMeta({
        seed: result.seed,
        size,
        sampler: samplerPreset,
        elapsedMs: Math.round(performance.now() - startTimeRef.current)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function reset() {
    setPrompt("");
    setSizePreset("1024x1024");
    setCustomSize("1024x1024");
    setSamplerPreset("V4_DEFAULT_20");
    setSeed(undefined);
    setError("");
    setMeta(null);
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

  function applyExample(example: string) {
    setPrompt(example);
    promptRef.current?.focus();
  }

  const formatElapsed = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

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
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
            />
          </label>

          <div className="inlineToolbar">
            <select
              className="exampleSelect"
              value=""
              onChange={(event) => applyExample(event.target.value)}
              aria-label="Example prompts"
            >
              <option value="" disabled>
                Try an example…
              </option>
              {EXAMPLE_PROMPTS.map((example) => (
                <option key={example} value={example}>
                  {example.length > 60 ? `${example.slice(0, 60)}…` : example}
                </option>
              ))}
            </select>
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

          {seed !== undefined ? (
            <label className="field">
              <span>Seed</span>
              <input
                type="number"
                value={seed}
                onChange={(event) => setSeed(Number(event.target.value))}
              />
            </label>
          ) : null}

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
          {isGenerating ? (
            <div className="skeleton" aria-label="Generating image" />
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Generated Ideogram output" />
          ) : (
            <div className="emptyState">
              <SlidersHorizontal size={34} />
              <span>Ready</span>
            </div>
          )}
        </div>

        {meta ? (
          <div className="metaBox">
            <span>Seed: {meta.seed}</span>
            <span>Size: {meta.size}</span>
            <span>Sampler: {meta.sampler}</span>
            <span>Time: {formatElapsed(meta.elapsedMs)}</span>
          </div>
        ) : null}

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
