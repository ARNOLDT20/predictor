# BetPredict Pro

A full-stack football bet prediction platform that analyses real matches worldwide, generates daily multi-bets, highlights high-value hot games, and provides deep statistical analysis per fixture — powered by live data from [football-data.org](https://www.football-data.org/).

---

## Features

| Page | Description |
|------|-------------|
| **Dashboard** | Mission Control — stats banner, Bet of the Day, Hot Games, upcoming matches |
| **Match Explorer** | Search/filter by country, league, status; grid or list view |
| **Match Detail** | Team form, win probabilities, H2H history, Poisson xG model, betting notes |
| **Hot Games** | High-value picks with value ratings |
| **Bet of the Day** | AI multi-bet: combined odds, payout calculator, confidence breakdown |
| **Bet Builder** | Build custom slips — pick matches & prediction types, live combined odds |
| **Predictions** | Accuracy chart by league + detailed breakdown table |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, Tailwind CSS, shadcn/ui, Recharts, Wouter, Framer Motion |
| API | Express 5, Pino logging |
| Database | PostgreSQL + Drizzle ORM |
| Prediction | Poisson xG model (server-side) |
| Validation | Zod, drizzle-zod |
| Packages | pnpm workspaces, Node.js 24, TypeScript 5.9 |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 24+
- pnpm (`npm install -g pnpm`)
- PostgreSQL 14+ running locally, **or** Docker

### 1. Clone & install

```bash
git clone https://github.com/ARNOLDT20/predictor.git
cd predictor
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and FOOTBALL_DATA_API_KEY
```

### 3. Apply database schema

```bash
pnpm --filter @workspace/db run push
```

### 4. Start services

In two separate terminals:

```bash
# Terminal 1 — API server (port 8080)
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 3000)
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/betpredict run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Docker Deployment (Recommended)

The Docker build produces **one container** that serves both the API and the built frontend — no separate web server needed.

### 1. Set up environment

```bash
cp .env.example .env
# Fill in:
#   FOOTBALL_DATA_API_KEY — from football-data.org
#   POSTGRES_PASSWORD     — any strong password
```

### 2. Build & run

```bash
docker compose up --build -d
```

The app will be available at [http://localhost:8080](http://localhost:8080).

### 3. Health check

```bash
curl http://localhost:8080/api/healthz
# → {"status":"ok"}
```

### Useful commands

```bash
docker compose logs -f app       # Stream app logs
docker compose logs -f db        # Stream DB logs
docker compose restart app       # Restart the app
docker compose down -v           # Stop and remove volumes (wipes DB)
```

---

## Deploy to Railway

1. Push your code to GitHub.
2. Create a new project on [Railway](https://railway.app) → **Deploy from GitHub repo**.
3. Add a **PostgreSQL** plugin — Railway auto-sets `DATABASE_URL`.
4. Add these environment variables in Railway dashboard:

   | Variable | Value |
   |----------|-------|
   | `FOOTBALL_DATA_API_KEY` | your key |
   | `NODE_ENV` | `production` |
   | `PORT` | `8080` |
   | `STATIC_DIR` | `/app/public` |

5. Set the **start command** to:
   ```
   node --enable-source-maps /app/dist/index.mjs
   ```
6. Set the **build command** to use the Dockerfile (Railway auto-detects it).

---

## Deploy to Render

1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository.
3. Set:
   - **Environment**: Docker
   - **Dockerfile path**: `./Dockerfile`
   - **Port**: `8080`
4. Add a **PostgreSQL** database — copy the connection string to `DATABASE_URL`.
5. Add env vars:

   | Variable | Value |
   |----------|-------|
   | `FOOTBALL_DATA_API_KEY` | your key |
   | `NODE_ENV` | `production` |
   | `STATIC_DIR` | `/app/public` |

---

## Deploy to Fly.io

```bash
# Install flyctl, then:
fly launch --dockerfile Dockerfile --no-deploy
fly postgres create --name betpredict-db
fly postgres attach betpredict-db
fly secrets set FOOTBALL_DATA_API_KEY=your_key NODE_ENV=production STATIC_DIR=/app/public
fly deploy
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `FOOTBALL_DATA_API_KEY` | ✅ | — | football-data.org API key ([free signup](https://www.football-data.org/)) |
| `PORT` | — | `8080` | Server listen port |
| `NODE_ENV` | — | `development` | `production` enables static file serving |
| `STATIC_DIR` | — | `../betpredict/dist/public` | Path to built frontend (production only) |
| `CORS_ORIGIN` | — | `*` | Allowed CORS origin(s) |
| `DB_POOL_MAX` | — | `10` | Max DB connections per process |

---

## Development Commands

```bash
pnpm run typecheck                            # Full TypeScript check
pnpm run build                               # Build all packages
pnpm --filter @workspace/api-spec run codegen # Regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/db run push         # Apply schema changes (dev)
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                    │
└──────────────────┬──────────────────────────┘
                   │ HTTP
┌──────────────────▼──────────────────────────┐
│         Express API (Node.js)               │
│  /api/* → API routes                        │
│  /*     → Static frontend (production)      │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  Prediction Engine (Poisson xG)      │   │
│  │  Sync Service (football-data.org)    │   │
│  └───────────────────┬──────────────────┘   │
└──────────────────────┼──────────────────────┘
                       │ SQL
┌──────────────────────▼──────────────────────┐
│           PostgreSQL Database               │
│  matches • leagues • bet_of_the_day         │
└─────────────────────────────────────────────┘
```

---

## API Rate Limits

football-data.org free tier: **10 requests/minute**.
The sync service respects this with a 7.5-second delay between requests and only syncs once every 30 minutes.

---

## License

MIT
