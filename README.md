<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LoueFacile

## Run locally

Prerequisite: Node.js

1. Install dependencies: `npm install`
2. Configure `.env.local` if needed:
   - `GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Start dev server: `npm run dev`
4. Build production bundle: `npm run build`

## Supabase setup (auth + profile)

1. In Supabase SQL Editor, run `supabase/profiles_schema.sql`.
2. If you already have a larger custom schema (properties/passes/unlocks), run `supabase/louefacile_hardening.sql` right after to secure RLS and trigger flows.
3. In Supabase Auth settings:
   - Enable Email provider.
   - Enable email confirmation (recommended).
   - In MFA settings, enable WebAuthn (for passkey support).
4. Configure redirect URLs:
   - `http://localhost:3000`
   - `http://localhost:3000/`
   - `http://localhost:3000/#/auth`
5. In `.env.local`, set:
   - `VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY`
   - Optional auth flags:
     - `VITE_ENABLE_PASSKEY=true|false`
     - `VITE_AUTH_GOOGLE=true|false`
     - `VITE_AUTH_FACEBOOK=true|false`
     - `VITE_AUTH_APPLE=true|false`

## OAuth providers

Enable each provider in Supabase Auth -> Providers and provide the provider credentials:
- Google
- Facebook
- Apple

Use the same site URL and redirect URLs configured in Supabase.

## Passkey note

With the current Supabase JS API used in this project, passkey is handled through WebAuthn MFA flows.
That means users should first have a regular authenticated session, then activate passkey from the dashboard.
