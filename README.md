# Star Wars Trivia AI

An infinite, level-based Star Wars trivia game. Questions are generated from the
[Star Wars API (SWAPI)](https://swapi.info), so every answer is grounded in real canon
data — no hallucinations, no API keys, no backend. Built as a static single-page app and
hosted on **Cloudflare Pages**.

## Gameplay

- **Rounds of 10 questions**, four multiple-choice options each.
- **Three ranks:** Padawan → Jedi → Jedi Master.
  - Score **6+ correct** in a round → **ascend** a rank.
  - Score **0–3 correct** → **descend** a rank.
  - Score **4–5** → hold your rank.
- Play **repeats forever**, with questions reshuffled and a recently-asked memory so they
  keep changing.
- Difficulty scales with rank: Padawan gets recognizable characters and homeworlds; Jedi
  gets planet/character/starship details; Jedi Master gets birth years, exact specs, and
  obscure trivia.

## Features

- 🌌 **Hyperspace warp background** — a looping canvas starfield (respects
  `prefers-reduced-motion`).
- 🗡️ **Lightsaber cursor** — the mouse is a glowing saber that swings with your movement.
- ✨ **Gold streak frame** — a glowing golden border appears at a **6+ correct-answer streak**.
- 💾 Progress (rank + best) persists in `localStorage`.
- 📦 **Offline-capable** — a committed SWAPI snapshot ships with the app; it refreshes from
  live SWAPI in the background when available.

## Tech

Vanilla JS + [Vite](https://vitejs.dev). No framework, no runtime dependencies.

```
src/
  main.js        bootstrap + game loop
  data.js        load SWAPI snapshot + live refresh + url lookups
  questions.js   template-based question generator
  game.js        round/level/streak state machine
  ui.js          DOM rendering
  hyperspace.js  canvas warp background
  cursor.js      lightsaber cursor
  styles.css     theme, gold frame, layout
scripts/
  fetch-swapi.mjs   regenerate the bundled data snapshot
public/data/
  swapi.json        committed SWAPI snapshot
```

## Develop

```bash
npm install
npm run fetch-data   # (re)generate public/data/swapi.json from swapi.info
npm run dev          # http://localhost:5173
npm run build        # production build -> dist/
npm run preview      # preview the production build
```

## Deploy to Cloudflare Pages

### Option A — direct upload via Wrangler

```bash
npm run build
npx wrangler pages deploy dist --project-name star-wars-trivia-ai
```

(Run `wrangler login` first to authenticate the target Cloudflare account, or set
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.)

### Option B — connect this GitHub repo for auto-deploy

In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, pick
this repo, and use:

- **Build command:** `npm run build`
- **Build output directory:** `dist`

Every push to the default branch then deploys automatically.

## Data / credits

Star Wars data courtesy of [SWAPI](https://swapi.info). Star Wars is a trademark of
Lucasfilm Ltd.; this is a non-commercial fan project. The hyperspace effect and lightsaber
cursor are generated in-code (no copyrighted assets).
