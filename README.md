# Monthly Expenditure (Vite + Nginx + Express + Postgres)

This repo is a simple full-stack app designed for Docker Compose deployment (including Coolify):

- `web/` — Vite + TypeScript frontend (built and served by **nginx**)
- `backend/` — Express + TypeScript REST API (`/api/...`)
- `db` — Postgres

The browser calls the API on the **same origin**:

- Frontend: `/`
- Backend: `/api/...` (proxied by nginx to the `api` container)

## Run locally (Docker Compose)

```bash
docker compose up --build
```

Open `http://localhost:8080`.

Note: local port mappings are defined in `docker-compose.override.yml` (auto-loaded by Docker Compose).

## Deploy to Coolify (Docker Compose)

1) In Coolify, create a **Docker Compose** application.
2) Point it at this repo and use [docker-compose.yml](docker-compose.yml).
3) Add a domain to the `web` service and set the internal port to `80`.

Environment variables you can set in Coolify (optional):

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `CORS_ORIGIN` (only needed if you deploy the frontend separately)

## Endpoints

- `GET /api/expenses?month=YYYY-MM` → list expenses + total
- `POST /api/expenses` → create expense
- `DELETE /api/expenses/:id` → delete expense
