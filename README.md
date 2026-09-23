# Football prediction app (formerly World Cup Oracle)

A football match prediction app: pick scores before kickoff, get scored against real results, and ask the Oracle — a Poisson-based match simulator with AI tactical commentary — for its suggested pick, complete with an animated canvas replay.

> **Status:** legacy World Cup 2026 mode still powers the UI; the whole-football foundation (SQLite, shared domain package, live fixture sync) is in place. Next: fixtures/predictions API and the new product UI.

## Stack

- **Monorepo** — npm workspaces: `packages/shared` (`@wco/shared`), `backend` (`wcp-api`), `wcp-web`.
- **Backend** — Express 4 + TypeScript (strict), helmet / CORS allowlist / rate limiting / express-validator, SQLite via Drizzle ORM, Poisson simulation engine, Google Gemini for AI commentary, football-data.org fixture sync.
- **Frontend** — React 19 + Vite + TypeScript, HTML5 canvas match animation, ESLint flat config.
- **Shared** — domain types, Poisson math, scoring rules, kickoff-lock rules (built to `dist/`, consumed by backend).

## Setup

```bash
npm install          # installs all workspaces
npm run build:shared # build @wco/shared (also runs automatically via predev)
```

Create `backend/.env` (see `backend/.env.example`):

```
PORT=3001
NODE_ENV=development
GEMINI_API_KEY=your_google_ai_key        # optional
FOOTBALL_DATA_API_KEY=your_fd_org_token  # optional, enables fixture sync
CORS_ORIGIN=http://localhost:5173        # optional
```

Run everything:

```bash
npm run dev
```

- Web: http://localhost:5173
- API health: http://localhost:3001/health
- Competitions: http://localhost:3001/api/competitions

## Scripts

| Where | Script | Purpose |
|---|---|---|
| root | `npm run dev` | shared build, then API + web concurrently |
| root | `npm run build:shared` | compile `@wco/shared` |
| root | `npm test` | shared + backend test suites |
| backend | `npm run dev` | API with nodemon/ts-node |
| backend | `npm run build` | Compile TypeScript to `dist/` |
| backend | `npm run sync:once` | one-shot fixture sync into SQLite |
| backend | `npm run db:generate` | generate a Drizzle migration after schema changes |
| wcp-web | `npm run dev` | Vite dev server |
| wcp-web | `npm run lint` | ESLint |
| wcp-web | `npm run build` | Type-check + production build |

## Database

SQLite at `backend/data/app.db` (gitignored). Migrations run automatically on boot; the competition list (PL, La Liga, Serie A, Bundesliga, Ligue 1, UCL, World Cup, Euro) is seeded on first run. Schema: `competitions`, `teams`, `fixtures`, `predictions` (device-owned until accounts ship).

## Fixture data

Live fixtures/results come from [football-data.org](https://www.football-data.org) (free tier, attribution required). The adapter caches and spaces requests for the 10 calls/min limit; without an API key the app still runs (sync disabled). Manual sync: `npm run sync:once` in `backend/`.

## Direction

Current product loop (legacy mode): browse fixtures → run the Oracle simulation → watch the animated replay → prediction stored locally.

Rebuild phases:

1. ~~Foundations~~ — workspaces, SQLite/Drizzle, shared domain package, fixture sync adapter. **Done.**
2. **Next:** fixtures/predictions API (device ID ownership), personal scoring, stats endpoints.
3. **Then:** auth (accounts claim device-owned predictions), competition UI, personal stats dashboard.
4. Canvas simulator stays as the Oracle assist.

## License

MIT — see [LICENSE](LICENSE).
