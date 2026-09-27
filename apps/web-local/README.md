# FoodXpres Local

Standalone Next.js PWA project for local staff. The current scope is sign-in and sign-out only.

## Run locally

From the repository root, install dependencies once with `pnpm install`, then start it with `pnpm dev:local` and open <http://localhost:3002>.

Set `DATABASE_URL` and `AUTH_SECRET` in `apps/web-local/.env.local`. `AUTH_SECRET` must be at least 32 characters. The API authenticates active `STAFF` accounts with an assigned restaurant in the existing FoodXpres database. The signed, HTTP-only session persists across browser restarts for up to 30 days or until sign-out.

## Deploy to Vercel

Create a separate Vercel project from this repository and set its Root Directory to `apps/web-local`. Add `DATABASE_URL` and a private `AUTH_SECRET` for Production, Preview, and Development as needed. The included `vercel.json` runs the monorepo-filtered build.

The PWA manifest is served at `/manifest.webmanifest`. Installation requires HTTPS outside localhost. This first stage does not cache login or API data offline.
