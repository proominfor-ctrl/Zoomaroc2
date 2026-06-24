# Su9.ma Local Setup

This project runs a React frontend and an Express/Vite backend. The admin dashboard uses Firebase Admin SDK to count users, listings, and pending reports.

## Prerequisites

- Node.js installed
- Firebase project configured
- Firebase Admin service account credentials available

## Install

1. Install dependencies:
   `npm install`

2. Copy `.env.example` to `.env`:
   `copy .env.example .env`

3. Provide Firebase admin credentials via one of these methods:
   - `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json`
   - `FIREBASE_ADMIN_CREDENTIALS={"type":"service_account", ...}`

4. (Optional) Set `FIREBASE_PROJECT_ID` if not using the default.

5. Run the app:
   `npm run dev`

## Admin dashboard notes

- The admin page requires a Firestore `users` collection with user roles.
- If the backend has no Firebase Admin credentials, `/api/admin/stats` will fail and the dashboard may show empty or error state.
- Do not commit `serviceAccountKey.json` to version control.

## Environment variables

- `FIREBASE_PROJECT_ID` — your Firebase project ID
- `GOOGLE_APPLICATION_CREDENTIALS` — path to a service account JSON file
- `FIREBASE_ADMIN_CREDENTIALS` — service account JSON as a single string
- `PORT` — optional local port (default 3000)
- `SUPABASE_URL` — Supabase project URL (Backend)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (Backend)
- `VITE_SUPABASE_URL` — Supabase project URL (Frontend)
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key (Frontend)

## Cloudflare Pages deployment

The site can be deployed from GitHub to Cloudflare Pages as a Vite app.

- Build command: `npm run build`
- Build output directory: `dist`
- Add these Cloudflare Pages environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `FIREBASE_API_KEY`
  - `FIREBASE_PROJECT_ID`
  - `FIRESTORE_DATABASE_ID` only if your Firestore database is not `(default)`

Cloudflare Pages Functions serve `functions/api/upload.ts` at `/api/upload`, so image uploads work without exposing the Supabase service role key in browser code.

## Troubleshooting

If admin stats still do not load:

- Verify `serviceAccountKey.json` exists and is valid
- Verify `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Check `npm run dev` output for Firebase Admin credential errors
