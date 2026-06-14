# ideogram text2img

A compact Next.js frontend for a Modal-hosted Ideogram text-to-image API.

The app provides a focused generation workspace: prompt controls on the left,
image preview on the right, and a server-side proxy that keeps the Modal API key
out of the browser.

## Features

- Next.js App Router frontend deployable on Vercel
- Server-side `/api/generate` proxy for the Modal image endpoint
- Read-only endpoint and model display values
- Prompt copy/clear controls
- Size presets plus custom `WIDTHxHEIGHT`
- Ideogram sampler presets: `V4_TURBO_12`, `V4_DEFAULT_20`, `V4_QUALITY_48`
- Optional deterministic seed
- Optional caption-issue rejection
- One-click PNG download from the generated base64 image

## Stack

- Next.js 16
- React 19
- TypeScript
- ESLint
- Vercel

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Set these locally in `.env.local` and in Vercel project settings:

```text
IDEOGRAM_API_BASE_URL=https://pradhankukiran--ideogram-4-fp8-api.modal.run
IDEOGRAM_FP8_API_KEY=your-modal-api-key
IDEOGRAM_MODEL=ideogram-4-fp8
NEXT_PUBLIC_IDEOGRAM_API_BASE_URL=https://pradhankukiran--ideogram-4-fp8-api.modal.run
NEXT_PUBLIC_IDEOGRAM_MODEL=ideogram-4-fp8
```

`IDEOGRAM_FP8_API_KEY` is only used by the server-side proxy route. It is never
sent to the browser.

## API Proxy

The browser posts generation requests to:

```text
POST /api/generate
```

The proxy validates the request, reads the Modal endpoint/model/API key from
environment variables, and forwards the request to:

```text
POST {IDEOGRAM_API_BASE_URL}/v1/images/generations
```

Supported request controls:

- `prompt`
- `size`
- `sampler_preset`
- `seed`
- `raise_on_caption_issues`
- fixed `n=1`
- fixed `response_format=b64_json`

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## Deploy

The project is configured for Vercel. `vercel.json` sets the generation route
timeout to 300 seconds:

```bash
vercel --prod
```

Use a Vercel plan that supports the configured function duration. Without
`IDEOGRAM_FP8_API_KEY` set in Vercel, the UI will deploy successfully but image
generation will return a missing-key error until the secret is added.
