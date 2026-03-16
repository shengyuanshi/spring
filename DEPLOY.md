# Deployment Plan

This project can be deployed as:

- Frontend: GitHub Pages
- Backend proxy: Supabase Edge Function
- Job state: Supabase Postgres table `custom_flower_jobs`

## 1. Create Supabase Project

In Supabase:

1. Create a new project.
2. Copy:
   - `Project URL`
   - `anon public key`
   - `service_role key`

## 2. Apply Database Schema

Run the SQL in:

- `supabase/migrations/20260316_create_custom_flower_jobs.sql`

You can paste it into the Supabase SQL Editor and run it once.

## 3. Create Edge Function Secrets

In Supabase Edge Functions secrets, set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MOONSHOT_MODEL` (optional, default is `kimi-k2.5`)
- `MOONSHOT_VISION_MODEL` (optional, default is `kimi-k2.5`)
- `GEMINI_IMAGE_MODEL` (optional)
- `FALLBACK_GEMINI_IMAGE_MODEL` (optional)

## 4. Deploy Supabase Function

Function source:

- `supabase/functions/custom-flowers/index.ts`

Recommended CLI flow:

1. `supabase login`
2. `supabase link --project-ref <your-project-ref>`
3. `supabase functions deploy custom-flowers --no-verify-jwt`

After deployment, the function base URL will look like:

`https://<project-ref>.supabase.co/functions/v1`

This project expects:

- `POST /custom-flowers/jobs`
- `GET /custom-flowers/jobs/:jobId`

So the frontend secret should be:

`VITE_API_BASE_URL=https://<project-ref>.supabase.co/functions/v1`

## 5. Configure GitHub Pages Secrets

In GitHub repository secrets, add:

- `VITE_API_BASE_URL`

Value example:

`https://<project-ref>.supabase.co/functions/v1`

## 6. Push to GitHub

Workflow file:

- `.github/workflows/deploy-pages.yml`

The workflow builds Vite and deploys `dist/` to GitHub Pages.

## 7. Frontend API Behavior

Frontend API helper:

- `src/lib/api.ts`

Rules:

- local dev without env: uses `/api`
- deployed frontend with `VITE_API_BASE_URL`: uses Supabase Functions

## 8. Current Limitation

The AI generation chain is long. If Supabase Edge Function execution time is too short for your plan tier or region, move the heavy generation path to:

- a dedicated server
- a queue worker
- or split image generation and SVG generation into separate jobs

The current Supabase version is suitable as a first deployment target, but the long-running SVG step is still the highest-risk part.
