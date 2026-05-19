type Env = {
  DB: D1Database
  ASSETS?: {
    fetch(request: Request): Promise<Response>
  }
}

type Operator = '+' | '-' | '*' | '/'

function json(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function okJson(data: unknown) {
  return json(data, { status: 200 })
}

function badRequest(message: string) {
  return json({ ok: false, error: message }, { status: 400 })
}

function notFoundJson(message = 'Not found') {
  return json({ ok: false, error: message }, { status: 404 })
}

function monthFromDate(dateStr: string): string {
  // Accepts YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('date must be YYYY-MM-DD')
  }
  return dateStr.slice(0, 7)
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseMonthOrDefault(maybe: string | null): string {
  if (!maybe) return monthFromDate(todayIsoDate())
  if (!/^\d{4}-\d{2}$/.test(maybe)) throw new Error('month must be YYYY-MM')
  return maybe
}

function amountToCents(amount: unknown): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) throw new Error('amount must be a number')
  const cents = Math.round(amount * 100)
  if (!Number.isSafeInteger(cents)) throw new Error('amount is too large')
  return cents
}

function withCors(request: Request, response: Response) {
  const origin = request.headers.get('origin')
  const headers = new Headers(response.headers)

  // For learning, we allow any origin. In production, restrict this.
  headers.set('access-control-allow-origin', origin ?? '*')
  headers.set('vary', 'origin')
  headers.set('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS')
  headers.set('access-control-allow-headers', 'content-type')
  headers.set('access-control-max-age', '86400')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

type Route =
  | { kind: 'hello' }
  | { kind: 'echo' }
  | { kind: 'calc' }
  | { kind: 'expenses'; id: string | null }

function matchRoute(url: URL, method: string): Route | null {
  const path = url.pathname
  if (method === 'GET' && path === '/api/hello') return { kind: 'hello' }
  if (method === 'POST' && path === '/api/echo') return { kind: 'echo' }
  if (method === 'POST' && path === '/api/calc') return { kind: 'calc' }

  if (path === '/api/expenses') {
    if (method === 'GET' || method === 'POST') return { kind: 'expenses', id: null }
  }

  const m = path.match(/^\/api\/expenses\/(\d+)$/)
  if (m && method === 'DELETE') return { kind: 'expenses', id: m[1] }

  return null
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method.toUpperCase()

    // Serve API routes
    if (url.pathname.startsWith('/api/')) {
      // fall through to the API router below
    } else if (env.ASSETS) {
      // Serve built frontend assets (single-worker deployment)
      const assetRes = await env.ASSETS.fetch(request)
      if (assetRes.status !== 404) return assetRes

      // SPA fallback
      const indexReq = new Request(new URL('/index.html', request.url), request)
      return env.ASSETS.fetch(indexReq)
    } else {
      return new Response('Build the frontend with npm run build:web before running the Worker.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    if (method === 'OPTIONS') {
      return withCors(request, new Response(null, { status: 204 }))
    }

    const r = matchRoute(url, method)

    if (r?.kind === 'hello') {
      const res = json({
        ok: true,
        message: 'Hello from a Cloudflare Worker API!',
        now: new Date().toISOString(),
      })
      return withCors(request, res)
    }

    if (r?.kind === 'echo') {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        const res = json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
        return withCors(request, res)
      }

      const res = json({
        ok: true,
        youSent: body,
        requestId: request.headers.get('cf-ray') ?? null,
      })
      return withCors(request, res)
    }

    if (r?.kind === 'calc') {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        const res = json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
        return withCors(request, res)
      }

      const isOp = (v: unknown): v is Operator => v === '+' || v === '-' || v === '*' || v === '/'
      const asNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

      if (typeof body !== 'object' || body === null) {
        const res = json({ ok: false, error: 'Body must be an object' }, { status: 400 })
        return withCors(request, res)
      }

      const { a, b, op } = body as { a?: unknown; b?: unknown; op?: unknown }
      const aa = asNum(a)
      const bb = asNum(b)
      if (aa === null || bb === null || !isOp(op)) {
        const res = json(
          {
            ok: false,
            error: 'Invalid payload. Expected { a: number, b: number, op: "+"|"-"|"*"|"/" }',
          },
          { status: 400 },
        )
        return withCors(request, res)
      }

      let result: number = NaN
      switch (op) {
        case '+':
          result = aa + bb
          break
        case '-':
          result = aa - bb
          break
        case '*':
          result = aa * bb
          break
        case '/':
          if (bb === 0) {
            const res = json({ ok: false, error: 'Division by zero' }, { status: 400 })
            return withCors(request, res)
          }
          result = aa / bb
          break
      }

      if (!Number.isFinite(result)) {
        const res = json({ ok: false, error: 'Computation error' }, { status: 400 })
        return withCors(request, res)
      }

      const res = json({
        ok: true,
        result,
        requestId: request.headers.get('cf-ray') ?? null,
      })
      return withCors(request, res)
    }

    if (r?.kind === 'expenses') {
      try {
        if (r.id && method === 'DELETE') {
          const id = Number(r.id)
          if (!Number.isInteger(id)) return withCors(request, badRequest('Invalid expense id'))

          const result = await env.DB.prepare('DELETE FROM expenses WHERE id = ?').bind(id).run()
          if ((result.meta.changes ?? 0) === 0) return withCors(request, notFoundJson('Expense not found'))
          return withCors(request, okJson({ ok: true }))
        }

        if (method === 'GET') {
          const month = parseMonthOrDefault(url.searchParams.get('month'))

          const rows = await env.DB.prepare(
            'SELECT id, date, month, amount_cents as amountCents, category, note, created_at as createdAt FROM expenses WHERE month = ? ORDER BY date DESC, id DESC',
          )
            .bind(month)
            .all()

          const totalCentsRow = await env.DB.prepare(
            'SELECT COALESCE(SUM(amount_cents), 0) as totalCents FROM expenses WHERE month = ?',
          )
            .bind(month)
            .first<{ totalCents: number }>()

          const totalCents = Number(totalCentsRow?.totalCents ?? 0)

          return withCors(
            request,
            okJson({
              ok: true,
              month,
              totalCents,
              items: rows.results ?? [],
            }),
          )
        }

        if (method === 'POST') {
          let body: unknown
          try {
            body = await request.json()
          } catch {
            return withCors(request, badRequest('Invalid JSON body'))
          }

          if (!isRecord(body)) return withCors(request, badRequest('Body must be an object'))

          const date = typeof body.date === 'string' ? body.date : todayIsoDate()
          const month = monthFromDate(date)
          const category = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : null
          const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null
          const amountCents = amountToCents(body.amount)

          if (!category) return withCors(request, badRequest('category is required'))
          if (amountCents === 0) return withCors(request, badRequest('amount must be non-zero'))

          const createdAt = new Date().toISOString()

          const insert = await env.DB.prepare(
            'INSERT INTO expenses (date, month, amount_cents, category, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          )
            .bind(date, month, amountCents, category, note, createdAt)
            .run()

          const id = insert.meta.last_row_id
          return withCors(
            request,
            json(
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
              { status: 201 },
            ),
          )
        }

        return withCors(request, notFoundJson())
      } catch (err) {
        return withCors(request, json({ ok: false, error: String(err) }, { status: 500 }))
      }
    }

    const notFoundRes = json(
      {
        ok: false,
        error: 'Not found',
        hint: 'Try GET /api/hello or GET /api/expenses?month=YYYY-MM',
      },
      { status: 404 },
    )
    return withCors(request, notFoundRes)
  },
} satisfies ExportedHandler<Env>
