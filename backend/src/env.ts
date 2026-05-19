export type Env = {
  port: number
  databaseUrl: string
  webDistDir: string
}

export function readEnv(): Env {
  const port = Number(process.env.PORT ?? 8787)
  if (!Number.isFinite(port) || port <= 0) throw new Error('PORT must be a valid number')

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required')

  // Run from backend/ in dev & prod. If you run from repo root, set WEB_DIST_DIR.
  const webDistDir = process.env.WEB_DIST_DIR ?? '../web/dist'

  return { port, databaseUrl, webDistDir }
}
