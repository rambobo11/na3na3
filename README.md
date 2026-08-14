# Na3Na3

One-tap daily log. Sync across Mac and phone via Supabase.

## Features

- **Home** — +1, today count, −1 undo, long-press +1 for +5
- **Stats** — 7 / 30 / 60 / 90 / 1y
- **Sync** — magic-link auth, multi-device
- Local cache for instant taps
- Days in **Europe/Paris**

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Supabase

1. Create a project
2. SQL Editor → run `supabase/schema.sql`
3. Auth → URL configuration:
   - Site URL: your Vercel URL (e.g. `https://na3na3.vercel.app`)
   - Redirect URLs: `https://na3na3.vercel.app/auth/callback`
   - Also keep localhost for local dev if needed
4. Put URL + anon key in `.env.local` and in Vercel env vars

## Vercel

Import `rambobo11/na3na3`, set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
