# Casted

Live selfie → a 5-second AI movie trailer.

You confirm you are 18+, consent to one-time biometric processing of your face, pick one locked scene (Action, Noir, or Myth), and capture a still from the live camera. A server route sends that still to [fal MiniMax H3 Max](https://fal.ai/models/minimax/h3-max/image-to-video/api). The still is not stored after the job is submitted. No accounts, no payments, no file upload, no prompt box.

## Local run

1. Clone this repo.
2. `npm install`
3. Copy `.env.example` to `.env.local` and set `FAL_KEY` (from [fal dashboard keys](https://fal.ai/dashboard/keys)). Never commit the real key.
4. `npm run dev`
5. Open `http://localhost:3000`. Browsers allow the camera on localhost; everywhere else needs HTTPS.

## Deploy on Vercel

Camera access requires HTTPS. Vercel provides that.

1. Go to [vercel.com](https://vercel.com) and sign in.
2. **Add New… → Project**.
3. **Import** the GitHub repo `terrafunded/casted` (this repo).
4. Framework preset: **Next.js**. Leave the build command as `next build` / `npm run build`.
5. Open **Environment Variables**.
6. Add `FAL_KEY` with your fal API key.
   - Mark it as **Sensitive**.
   - Enable it for **Production** and **Preview**.
   - Do not prefix it with `NEXT_PUBLIC_`. It must stay server-only.
7. Click **Deploy**.
8. After the first deploy, open the `*.vercel.app` URL on a phone and allow the camera when prompted.

The generate route is configured with a high `maxDuration` (up to 300s). Vercel will cap this to your plan limit. H3 Max often needs about 60 seconds; if a deploy times out, raise the function duration on a Pro plan.

## Stack

- Next.js App Router + TypeScript
- `@fal-ai/client` on the server (`minimax/h3-max/image-to-video`)
- ES / EN copy (browser language, default English, toggle in the header)
