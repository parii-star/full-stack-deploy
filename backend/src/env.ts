export type Env = {
  port: number
  databaseUrl: string
}

export function readEnv(): Env {
  const port = Number(process.env.PORT ?? 3000)
  if (!Number.isFinite(port) || port <= 0) throw new Error('PORT must be a valid number')

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required')

  return { port, databaseUrl }
}
