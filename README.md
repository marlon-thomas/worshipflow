# WorshipFlow

A mobile app (iOS + Android + web) for worship teams. Leaders build a setlist for a service
and assign keys; team members get Spotify & YouTube links to practice, lyric sheets, and
chord charts automatically transposed to the chosen key.

## Features

- **Song library** — title, artist, default key, tempo, ChordPro chart (lyrics + chords)
- **Spotify & YouTube linking with disambiguation** — when adding a song you search both
  platforms and tap the exact version, so "Way Maker" by Sinach is never confused with a cover
- **Setlists** — build a service order, set the key per song, reorder, remove
- **Auto-transposing chord charts** — chord-over-lyric rendering in the selected key
- **Lyric sheets** — chord-free view for vocalists
- **Send to team** — share the full setlist (keys + Spotify/YouTube links) via WhatsApp,
  email, etc. using the native share sheet
- **Multi-user teams** — invite code onboarding, leader/member roles

## Tech

- Expo SDK 57 (React Native) + expo-router, TypeScript
- Supabase: Postgres + Auth + Edge Functions (secrets for Spotify/YouTube stay server-side)

## Setup

### 1. Supabase project

1. Create a free project at [supabase.com](https://supabase.com)
2. In the SQL Editor, paste and run [`supabase/schema.sql`](supabase/schema.sql)
3. Copy `.env.example` to `.env` and fill in `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API)

### 2. Edge Functions (Spotify/YouTube search)

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```sh
supabase link --project-ref <your-project-ref>
supabase functions deploy spotify-search
supabase functions deploy youtube-search
supabase secrets set \
  SPOTIFY_CLIENT_ID=... \
  SPOTIFY_CLIENT_SECRET=... \
  YOUTUBE_API_KEY=...
```

- Spotify credentials: [developer.spotify.com](https://developer.spotify.com) → create app →
  Client ID + Client Secret
- YouTube API key: Google Cloud Console → enable **YouTube Data API v3** → create API key

(The app works without these — the search buttons will just show an error hint.)

### 3. Run

```sh
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS/Android) to run on your phone, or press `w` for web.

## PWA (installable web app)

WorshipFlow ships as a Progressive Web App so churches can install it on their phones
without an App Store. Set `web.output` to `static` in **app.json** (already done) and use
`src/app/+html.tsx` for the web head + `public/` for PWA assets:

```
public/
  .nojekyll             prevents GitHub Pages from dropping _expo/ assets
  manifest.json         app name, icons, standalone display, colors
  sw.js                 minimal service worker (fetch passthrough, no caching)
  icon-192.png          install icon (192px)
  icon-512.png          install icon (512px)
  icon-maskable-512.png Android maskable icon
  apple-touch-icon.png  iOS home-screen icon (180px)
```

Build the static output (this also bakes `EXPO_PUBLIC_*` from `.env`):

```sh
npx expo export -p web   # writes to dist/
```

Verify: `dist/` should contain `manifest.json`, `sw.js`, the icons, `favicon.ico`, and one
HTML file per route (deep links like `/login` work because they're real files).

### How to install on devices

- **Android (Chrome):** open the hosted site → menu → *Install app* (the manifest + service
  worker trigger the install prompt)
- **iPhone/iPad (Safari):** open the site → Share → *Add to Home Screen*
- The installed app shows as full-screen (no browser chrome)

## Deploy

**Live:** https://marlon-thomas.github.io/worshipflow/

`npx expo export -p web` produces a fully static `dist/` — deployable to any static host.
Deep links resolve as real files, so no SPA rewrite rules are needed.

### GitHub Pages (current)

Rebuild + deploy in one shot:
```sh
EXPO_PUBLIC_BASE_URL=/worshipflow npx expo export -p web
npx gh-pages -t -d dist
```

The `EXPO_PUBLIC_BASE_URL` env var prefixes all asset/route paths so the app
works under the `/worshipflow/` subpath. Omit it for root-domain or local dev.

### Vercel
```sh
npx vercel dist --prod
```

### Netlify
```sh
npx netlify deploy --dir=dist --prod
```

> Notes: `dist/`, `.env`, and `.env.*` are gitignored. `EXPO_PUBLIC_*` values are baked in at
> export time, so rebuild before deploying to pick up changes to `.env`.

## Project layout

```
src/app/            expo-router screens
  (auth)/login      sign in / sign up
  team-setup        create or join a team
  (tabs)/           Setlists · Songs · Team
  setlist/[id]      setlist detail: keys, links, lyrics, transposed charts, share
  song/new          add song + Spotify/YouTube disambiguation search
  song/[id]         song view with transpose stepper
src/lib/            client logic (supabase, session, transpose, chordpro, music search)
src/components/     themed UI, KeyPicker, ChordChart
supabase/schema.sql database schema + RLS
supabase/functions/ spotify-search, youtube-search edge functions
scripts/test-music.ts  chord engine tests: npx tsx scripts/test-music.ts
```

## ChordPro format

Charts use inline chords in brackets; sections via `{comment: ...}`:

```
{comment: Verse 1}
[G]Amazing [D]grace, how [Em]sweet the [D]sound
```

The engine transposes roots, qualities (`m7`, `sus4`, `maj9`…) and slash basses (`G/B`),
choosing sharps or flats based on the target key.
