This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Customer account protection

New customer accounts use a numeric 4-digit PIN. Existing customer passwords continue to work so customers are not locked out; they can sign in with the old password and replace it with a PIN from their profile.

Login and registration use a shared Upstash Redis rate limiter. Create an Upstash Redis database and set these server-only variables in this app's local `.env.local` and in the Vercel project for Production, Preview, and Development:

```env
UPSTASH_REDIS_REST_URL=https://<your-database>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<server-side-token>
```

Do not prefix either variable with `NEXT_PUBLIC_` or commit their values. In production the login and registration endpoints fail closed with HTTP 503 if Redis is missing or unavailable. For local development only, a process-local limiter is used when these variables are absent; its counters do not persist across restarts or across multiple instances.

Limits: login allows 5 attempts per phone and 30 per IP per 15 minutes; registration allows 3 attempts per phone and 10 per IP per hour. These counts include successful submissions.
