# Express backend (replacement for Worker)

This folder provides an Express.js + Postgres backend that exposes the same API as the Cloudflare Worker, and can serve the built frontend from `web/dist`.

## Prereqs

- Node.js 18+ (Node 20 recommended)
- A Postgres database (Coolify can provision one)

## Environment

Copy `.env.example` to `.env` and set `DATABASE_URL`.

## Run locally

From repo root, build the frontend once:

```bash
cd web
npm install
npm run build
```

Then run backend:

```bash
cd ../backend
npm install
cp .env.example .env
# edit DATABASE_URL
npm run db:migrate
npm run dev
```

Open `http://127.0.0.1:8787`.

## Deploy on Coolify

Recommended approach: use the repo root [Dockerfile](../Dockerfile).

- **Build pack**: Dockerfile
- **Port**: `8787` (or set `PORT`)
- **Required env**:
	- `DATABASE_URL` (Postgres connection string)
	- `PORT` (optional; defaults to `8787`)

On container start, `npm start` runs migrations automatically via `prestart`.

## API

- `GET /api/expenses?month=YYYY-MM`
- `POST /api/expenses`
- `DELETE /api/expenses/:id`
