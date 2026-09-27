# FoodXpres Driver

Standalone Next.js PWA project for delivery drivers. The current scope is sign-in and sign-out only.

## Run locally

From the repository root, install dependencies once with `pnpm install`, then start it with `pnpm dev:driver` and open <http://localhost:3003>.

Set `DATABASE_URL` and `AUTH_SECRET` in `apps/web-driver/.env.local`. `AUTH_SECRET` must be at least 32 characters. The API authenticates active `DRIVER` accounts that have a `driver_detalles` record. The signed, HTTP-only session persists across browser restarts for up to 30 days or until sign-out.

## Deploy to Vercel

Create a separate Vercel project from this repository and set its Root Directory to `apps/web-driver`. Add `DATABASE_URL` and a private `AUTH_SECRET` for Production, Preview, and Development as needed. The included `vercel.json` runs the monorepo-filtered build.

The PWA manifest is served at `/manifest.webmanifest`. Installation requires HTTPS outside localhost. This first stage does not cache login or API data offline.
