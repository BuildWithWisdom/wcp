# Football prediction app (formerly World Cup Oracle)

A football match prediction app: pick scores before kickoff, get scored against real results, and ask the Oracle — a Poisson-based match simulator with AI tactical commentary — for its suggested pick, complete with an animated canvas replay.

> **Status:** legacy World Cup 2026 mode. The app is being rebuilt into a whole-football product (top-5 European leagues, Champions League, and internationals) with live fixture data and user accounts. See *Direction* below.

## Stack

- **Backend** — Express 4 + TypeScript (strict), helmet / CORS allowlist / rate limiting / express-validator, Poisson simulation engine, Google Gemini for AI commentary, JSON-file persistence (replaced by SQLite in the rebuild).
- **Frontend** — React 19 + Vite + TypeScript, HTML5 canvas match animation, ESLint flat config.
- **Monorepo** — root `npm run dev` runs API (`:3001`) and web (`:5173`) together via `concurrently`.

## Setup

```bash
npm install          # root
npm run install:all  # backend + frontend deps
```

Create `backend/.env`:

```
PORT=3001
NODE_ENV=development
GEMINI_API_KEY=your_google_ai_key   # optional; falls back to neutral modifiers
CORS_ORIGIN=http://localhost:5173   # optional; comma-separated allowlist
```

Run everything:

```bash
npm run dev
```

- Web: http://localhost:5173
- API health: http://localhost:3001/health

## Scripts

| Where | Script | Purpose |
|---|---|---|
| root | `npm run dev` | API + web concurrently |
| backend | `npm run dev` | API with nodemon/ts-node |
| backend | `npm run build` | Compile TypeScript to `dist/` |
| wcp-web | `npm run dev` | Vite dev server |
| wcp-web | `npm run lint` | ESLint |
| wcp-web | `npm run build` | Type-check + production build |

## Direction

Current product loop (legacy mode): browse fixtures → run the Oracle simulation → watch the animated replay → prediction stored locally.

Rebuild phases underway:

1. **Foundations** — repo hygiene (done), real database (SQLite/Drizzle), shared domain package, auth (email + password sessions).
2. **Data** — football-data.org adapter for live fixtures/results across PL, La Liga, Serie A, Bundesliga, Ligue 1, UCL, and international windows.
3. **Product** — server-side predictions locked at kickoff, personal scoring (exact score / correct outcome), accuracy & streak stats.
4. **UI** — competition switcher, prediction entry, personal stats dashboard; the canvas simulator stays as the Oracle assist.

## License

MIT — see [LICENSE](LICENSE).
