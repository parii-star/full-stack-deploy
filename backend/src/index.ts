import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb } from './db.js'
import { readEnv } from './env.js'
import { amountToCents, isRecord, monthFromDate, parseMonthOrDefault, todayIsoDate } from './utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function json(res: express.Response, data: unknown, status = 200) {
  res.status(status).type('application/json; charset=utf-8').send(JSON.stringify(data))
}

function badRequest(res: express.Response, message: string) {
  return json(res, { ok: false, error: message }, 400)
}

function notFound(res: express.Response, message = 'Not found') {
  return json(res, { ok: false, error: message }, 404)
}

const env = readEnv()
const db = createDb(env.databaseUrl)

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

app.get('/api/hello', (_req, res) => {
  json(res, { ok: true, message: 'Hello from an Express API!', now: new Date().toISOString() })
})

app.get('/api/expenses', async (req, res) => {
  try {
    const month = parseMonthOrDefault(typeof req.query.month === 'string' ? req.query.month : null)

    type ExpenseRow = {
      id: number | string
      date: string
      month: string
      amountCents: number
      category: string
      note: string | null
      createdAt: string
    }

    const itemsResult = await db.query<ExpenseRow>(
      `SELECT id, to_char(date, 'YYYY-MM-DD') as date, month,
              amount_cents as "amountCents", category, note,
              to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
       FROM expenses
       WHERE month = $1
       ORDER BY date DESC, id DESC`,
      [month],
    )

    const totalResult = await db.query<{ totalCents: string | number }>(
      'SELECT COALESCE(SUM(amount_cents), 0) as "totalCents" FROM expenses WHERE month = $1',
      [month],
    )

    const totalCents = Number(totalResult.rows[0]?.totalCents ?? 0)
    const items = itemsResult.rows.map((row) => ({
      ...row,
      id: Number(row.id),
    }))

    json(res, {
      ok: true,
      month,
      totalCents,
      items,
    })
  } catch (err) {
    json(res, { ok: false, error: String(err) }, 500)
  }
})

app.post('/api/expenses', async (req, res) => {
  try {
    const body: unknown = req.body
    if (!isRecord(body)) return badRequest(res, 'Body must be an object')

    const date = typeof body.date === 'string' ? body.date : todayIsoDate()
    const month = monthFromDate(date)
    const category = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : null
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
    const amountCents = amountToCents(body.amount)

    if (!category) return badRequest(res, 'category is required')
    if (amountCents === 0) return badRequest(res, 'amount must be non-zero')

    const createdAt = new Date().toISOString()

    const insert = await db.query<{ id: string | number }>(
      'INSERT INTO expenses (date, month, amount_cents, category, note, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [date, month, amountCents, category, note, createdAt],
    )

    const id = Number(insert.rows[0]?.id)

    json(
      res,
      {
        ok: true,
        item: {
          id,
          date,
          month,
          amountCents,
          category,
          note,
          createdAt,
        },
      },
      201,
    )
  } catch (err) {
    json(res, { ok: false, error: String(err) }, 500)
  }
})

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return badRequest(res, 'Invalid expense id')

    const del = await db.query('DELETE FROM expenses WHERE id = $1', [id])
    if ((del.rowCount ?? 0) === 0) return notFound(res, 'Expense not found')

    json(res, { ok: true })
  } catch (err) {
    json(res, { ok: false, error: String(err) }, 500)
  }
})

// Serve built frontend (SPA)
const webDistDir = path.resolve(__dirname, '..', env.webDistDir)
app.use(express.static(webDistDir))

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return notFound(res)
  res.sendFile(path.join(webDistDir, 'index.html'))
})

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Express API ready on http://0.0.0.0:${env.port}`)
})
