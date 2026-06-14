export const SAMPLER_PRESETS = [
  "V4_TURBO_12",
  "V4_DEFAULT_20",
  "V4_QUALITY_48"
] as const;

export type SamplerPreset = (typeof SAMPLER_PRESETS)[number];

export type IdeogramRequest = {
  prompt: string;
  size: string;
  sampler_preset: SamplerPreset;
  seed?: number;
  n: number;
  response_format: "b64_json";
  raise_on_caption_issues: boolean;
};

export type IdeogramResponse = {
  created: number;
  data: Array<{ b64_json: string }>;
};

export type GenerateResult =
  | { ok: true; imageDataUrl: string; raw: IdeogramResponse }
  | { ok: false; error: string; status?: number; details?: unknown };

export function parseSize(size: string): { width: number; height: number } {
  const [width, height] = size.toLowerCase().split("x").map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error("Size must be WIDTHxHEIGHT.");
  }
  return { width, height };
}

export function validateDimension(value: number, label: string): string | null {
  if (!Number.isInteger(value)) return `${label} must be an integer.`;
  if (value < 256 || value > 2048) return `${label} must be between 256 and 2048.`;
  if (value % 16 !== 0) return `${label} must be a multiple of 16.`;
  return null;
}

export function validateSize(width: number, height: number): string | null {
  return (
    validateDimension(width, "Width") ||
    validateDimension(height, "Height") ||
    (Math.max(width / height, height / width) > 6 ? "Aspect ratio must not exceed 6:1." : null)
  );
}
