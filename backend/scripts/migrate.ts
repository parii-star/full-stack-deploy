import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb } from '../src/db.js'
import { readEnv } from '../src/env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const env = readEnv()
  const db = createDb(env.databaseUrl)

  try {
    const migrationsDir = path.resolve(__dirname, '..', 'migrations')
    const entries = await fs.readdir(migrationsDir)
    const sqlFiles = entries.filter((f) => f.endsWith('.sql')).sort()

    if (sqlFiles.length === 0) {
      console.log('No migrations found.')
      return
    }

    for (const file of sqlFiles) {
      const fullPath = path.join(migrationsDir, file)
      const sql = await fs.readFile(fullPath, 'utf8')
      console.log(`Applying ${file}...`)
      await db.query(sql)
    }

    console.log('Migrations applied.')
  } finally {
    await db.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
