# Monthly Expenditure (Single Worker + D1)

This repo contains a minimal full-stack example:

- `web/` — Vite + TypeScript frontend (built into `web/dist`)
- `worker/` — Cloudflare Worker that serves:
	- the built frontend assets (`worker/dist` copied from `web/dist`)
	- the API (`/api/...`)
	- the D1 database

The frontend calls the Worker API from the browser to create/list/delete expenses.

## Express backend (Postgres) option

This repo also includes an Express.js backend in [backend/README.md](backend/README.md) that:

- exposes the same `/api/...` endpoints
- uses Postgres (better fit for Coolify)
- can serve the built frontend from `web/dist`

### Troubleshooting (unstyled page / module script error)

If you see an error like:

- `Failed to load module script ... /src/main.ts` (often with MIME type `video/mp2t`)

it means you're serving the **dev** file `web/index.html` from a plain web server.
That file references TypeScript (`/src/main.ts`) which only works when served by Vite.

Fix: serve the **built** frontend (`web/dist`) or use the repo root `Dockerfile` (recommended for Coolify).

## Prereqs

- Node.js 18+ (Node 20 recommended)
- Cloudflare account
- Wrangler CLI: `npm i -g wrangler` (or use `npx wrangler`)
- Login once: `wrangler login`

## 1) Run locally (single Worker)

### Terminal A — migrate D1 + build web + start the Worker

```bash
cd worker
npm install
npm run db:migrate:local
npm run dev
```

This starts the Worker at `http://127.0.0.1:8787`.

If you're accessing it from another device (or via `sslip.io`), use your machine's IP/hostname with port `8787`.

Open `http://localhost:8787`.

## 2) Deploy (single Worker)

### Create the D1 database (one-time)

```bash
cd worker
wrangler d1 create full_stack_expenses
```

Copy the `database_id` that Wrangler prints and paste it into [worker/wrangler.toml](worker/wrangler.toml) under `d1_databases`.

### Apply migrations (remote)

```bash
cd worker
npm run db:migrate:remote
```

### Deploy the Worker (serves UI + API)

Pick a unique Worker name by editing [worker/wrangler.toml](worker/wrangler.toml) (`name = "your-api-name"`).

```bash
cd worker
npm install
npm run build:web
npm run deploy
```

After deploy, Wrangler prints a `https://...workers.dev` URL.

## 3) Put it on your custom domain

Your expenses will persist in the cloud (D1) across refreshes and new tabs as long as you:

- use a real `database_id` in [worker/wrangler.toml](worker/wrangler.toml)
- run `npm run db:migrate:remote`
- deploy the Worker

### Option A (recommended): Custom Domains in the Cloudflare dashboard

1) Open Cloudflare Dashboard → **Workers & Pages** → your Worker.
2) Go to **Triggers** (or **Settings**) → **Custom Domains** → **Add custom domain**.
3) Choose something like `expenses.yourdomain.com` (or `yourdomain.com`).
4) Cloudflare will handle the DNS/proxying since the zone is on Cloudflare.

### Option B: Routes via `wrangler.toml`

If your domain is on Cloudflare, you can attach a route pattern.

1) Edit [worker/wrangler.toml](worker/wrangler.toml) and add:

```toml
routes = [
	{ pattern = "expenses.example.com/*", zone_name = "example.com" }
]
```

2) Deploy again:

```bash
cd worker
npm run deploy
```

## Using the app

- Expenses are stored by month (YYYY-MM).
- Use the Month picker to view older months.

## Notes

- In this setup, the browser calls the API on the **same origin** (no special `VITE_API_BASE` needed in production).
- CORS is still enabled for local dev / flexibility.

## Endpoints

- `GET /api/expenses?month=YYYY-MM` → list expenses + total
- `POST /api/expenses` → create expense
- `DELETE /api/expenses/:id` → delete expense

---

If you tell me your domain (example: `example.com`) and which hostname you want (`expenses.example.com` vs `example.com`), I can fill in the exact `routes` entry for you.
