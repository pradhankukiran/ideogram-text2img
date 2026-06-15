import { NextRequest, NextResponse } from "next/server";
import {
  SAMPLER_PRESETS,
  parseSize,
  validateSize,
  type IdeogramRequest,
  type IdeogramResponse
} from "@/lib/ideogram";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_BASE_URL = "https://pradhankukiran--ideogram-4-fp8-api.modal.run";
const DEFAULT_MODEL = "ideogram-4-fp8";
const DEFAULT_SAMPLER = "V4_DEFAULT_20";

export async function POST(request: NextRequest) {
  let payload: Partial<IdeogramRequest>;

  try {
    payload = (await request.json()) as Partial<IdeogramRequest>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON request body." }, { status: 400 });
  }

  const apiBaseUrl = stripTrailingSlash(process.env.IDEOGRAM_API_BASE_URL || DEFAULT_BASE_URL);
  const apiKey = process.env.IDEOGRAM_FP8_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Missing API key." }, { status: 400 });
  }

  const prompt = payload.prompt?.trim();
  const model = process.env.IDEOGRAM_MODEL || DEFAULT_MODEL;
  const samplerPreset = payload.sampler_preset || DEFAULT_SAMPLER;
  const knownSamplers: readonly string[] = SAMPLER_PRESETS;

  if (!prompt) {
    return NextResponse.json({ ok: false, error: "Prompt is required." }, { status: 400 });
  }

  if (!knownSamplers.includes(samplerPreset)) {
    return NextResponse.json({ ok: false, error: "Unsupported sampler preset." }, { status: 400 });
  }

  let width: number;
  let height: number;

  try {
    const parsed = parseSize(payload.size || "");
    width = parsed.width;
    height = parsed.height;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid size." },
      { status: 400 }
    );
  }

  const sizeError = validateSize(width, height);
  if (sizeError) {
    return NextResponse.json({ ok: false, error: sizeError }, { status: 400 });
  }

  if (payload.n !== undefined && payload.n !== 1) {
    return NextResponse.json({ ok: false, error: "Only n=1 is supported by this API." }, { status: 400 });
  }

  if (payload.response_format !== undefined && payload.response_format !== "b64_json") {
    return NextResponse.json({ ok: false, error: "Only response_format=b64_json is supported." }, { status: 400 });
  }

  const upstreamPayload = {
    model,
    prompt,
    n: 1,
    size: `${width}x${height}`,
    width,
    height,
    sampler_preset: samplerPreset,
    seed: payload.seed,
    response_format: "b64_json"
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl}/v1/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(upstreamPayload),
      redirect: "follow"
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Could not reach image generation API.",
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 502 }
    );
  }

  const text = await upstream.text();
  let body: unknown;

  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: text || "Upstream returned a non-JSON response." };
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { ok: false, error: "Image generation failed.", status: upstream.status, details: body },
      { status: upstream.status }
    );
  }

  const imageResponse = body as IdeogramResponse;
  const b64 = imageResponse.data?.[0]?.b64_json;

  if (!b64) {
    return NextResponse.json(
      {
        ok: false,
        error: "Upstream response did not include data[0].b64_json.",
        details: body
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    imageDataUrl: `data:image/png;base64,${b64}`,
    raw: imageResponse
  });
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
