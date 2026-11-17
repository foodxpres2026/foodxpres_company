# FoodXpres Local

Standalone Next.js PWA project for local staff. It supports order operations, direct orders, delivery quotes, commissions, and push notifications.

## Run locally

From the repository root, install dependencies once with `pnpm install`, then start it with `pnpm dev:local` and open <http://localhost:3002>.

Set `DATABASE_URL`, `AUTH_SECRET`, and `ORS_API_KEY` in `apps/web-local/.env.local`. `AUTH_SECRET` must be at least 32 characters. `ORS_API_KEY` is required to quote delivery by real street route when no cached route exists. The API authenticates active `STAFF` accounts with an assigned restaurant in the existing FoodXpres database. The signed, HTTP-only session persists across browser restarts for up to 30 days or until sign-out.

## Deploy to Vercel

Create a separate Vercel project from this repository and set its Root Directory to `apps/web-local`. Add `DATABASE_URL`, a private `AUTH_SECRET`, and `ORS_API_KEY` for each environment where the app runs. The included `vercel.json` runs the monorepo-filtered build.

The PWA manifest is served at `/manifest.webmanifest`. Installation requires HTTPS outside localhost. This first stage does not cache login or API data offline.
