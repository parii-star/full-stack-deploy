# Express backend (REST API)

This folder provides an Express.js + Postgres backend that exposes a REST API under `/api/...`.

## Prereqs

- Node.js 18+ (Node 20 recommended)
- A Postgres database (Coolify can provision one)

## Environment

Copy `.env.example` to `.env` and set `DATABASE_URL`.

## Run locally

Run backend:

```bash
cd backend
npm install
cp .env.example .env
# edit DATABASE_URL
npm run db:migrate
npm run dev
```

Open `http://127.0.0.1:3000/api/hello`.

## Deploy on Coolify

Recommended approach: deploy the repo root [docker-compose.yml](../docker-compose.yml) (Coolify Docker Compose).

On container start, `npm start` runs migrations automatically via `prestart`.

## API

- `GET /api/expenses?month=YYYY-MM`
- `POST /api/expenses`
- `DELETE /api/expenses/:id`
