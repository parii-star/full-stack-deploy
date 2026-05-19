import './style.css'

type ExpenseItem = {
  id: number
  date: string
  month: string
  amountCents: number
  category: string
  note: string | null
  createdAt: string
}

type ExpensesListResponse =
  | { ok: true; month: string; totalCents: number; items: ExpenseItem[] }
  | { ok: false; error: string }

type CreateExpenseResponse =
  | { ok: true; item: ExpenseItem }
  | { ok: false; error: string }

function mustGet<T extends Element>(selector: string): T {
  const el = document.querySelector(selector)
  if (!el) throw new Error(`Missing element: ${selector}`)
  return el as T
}

// Only honor VITE_API_BASE during Vite dev (`vite` on port 5173).
// In production (built assets served by the Worker), use same-origin `/api/...`.
const apiBase = (
  (import.meta.env.DEV ? (import.meta.env.VITE_API_BASE as string | undefined) : undefined) ??
  ''
).replace(/\/$/, '')

function apiUrl(path: string) {
  return apiBase ? `${apiBase}${path}` : path
}

async function readJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { ok: false, error: `Non-JSON response (HTTP ${res.status})` }
  }
}

const monthEl = mustGet<HTMLInputElement>('#month')
const dateEl = mustGet<HTMLInputElement>('#date')
const categoryEl = mustGet<HTMLInputElement>('#category')
const amountEl = mustGet<HTMLInputElement>('#amount')
const noteEl = mustGet<HTMLInputElement>('#note')
const formEl = mustGet<HTMLFormElement>('#expense-form')
const itemsEl = mustGet<HTMLDivElement>('#items')
const totalEl = mustGet<HTMLDivElement>('#total')
const statusEl = mustGet<HTMLDivElement>('#status')
const addBtn = mustGet<HTMLButtonElement>('#add')

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthFromDate(dateStr: string): string {
  return dateStr.slice(0, 7)
}

function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const major = Math.floor(abs / 100)
  const minor = String(abs % 100).padStart(2, '0')
  return `${sign}₹${major.toLocaleString('en-IN')}.${minor}`
}

function setStatus(message: string) {
  statusEl.textContent = message
}

function setLoading(isLoading: boolean) {
  addBtn.disabled = isLoading
  addBtn.textContent = isLoading ? 'Adding…' : 'Add expense'
}

async function apiGetExpenses(month: string): Promise<ExpensesListResponse> {
  try {
    const res = await fetch(`${apiUrl('/api/expenses')}?month=${encodeURIComponent(month)}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    })

    const data = (await readJsonResponse(res)) as ExpensesListResponse
    if (!res.ok) {
      const err = (data as { ok?: boolean; error?: string }).error
      return { ok: false, error: err ?? `HTTP ${res.status}` }
    }
    return data
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

async function apiCreateExpense(payload: {
  date: string
  category: string
  amount: number
  note?: string
}): Promise<CreateExpenseResponse> {
  try {
    const res = await fetch(apiUrl('/api/expenses'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = (await readJsonResponse(res)) as CreateExpenseResponse
    if (!res.ok) {
      const err = (data as { ok?: boolean; error?: string }).error
      return { ok: false, error: err ?? `HTTP ${res.status}` }
    }
    return data
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

async function apiDeleteExpense(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(apiUrl(`/api/expenses/${id}`), {
      method: 'DELETE',
      headers: { accept: 'application/json' },
    })
    const data = (await readJsonResponse(res)) as { ok?: boolean; error?: string }
    if (!res.ok || data.ok === false) return { ok: false, error: data.error ?? `HTTP ${res.status}` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

function renderItems(items: ExpenseItem[]) {
  itemsEl.innerHTML = ''
  if (items.length === 0) {
    itemsEl.innerHTML = '<div class="status">No expenses for this month yet.</div>'
    return
  }

  const frag = document.createDocumentFragment()
  for (const item of items) {
    const row = document.createElement('div')
    row.className = 'row'

    const date = document.createElement('div')
    date.textContent = item.date

    const cat = document.createElement('div')
    const categoryPill = document.createElement('span')
    categoryPill.className = 'pill'
    categoryPill.textContent = item.category
    cat.appendChild(categoryPill)
    if (item.note) {
      const notePill = document.createElement('span')
      notePill.className = 'pill'
      notePill.style.marginLeft = '8px'
      notePill.textContent = item.note
      cat.appendChild(notePill)
    }

    const amt = document.createElement('div')
    amt.className = 'right'
    amt.textContent = formatMoney(item.amountCents)

    const actions = document.createElement('div')
    actions.className = 'right'
    const del = document.createElement('button')
    del.type = 'button'
    del.className = 'iconbtn'
    del.textContent = '🗑'
    del.title = 'Delete'
    del.addEventListener('click', async () => {
      del.disabled = true
      const res = await apiDeleteExpense(item.id)
      if (!res.ok) setStatus(res.error)
      await refresh()
    })
    actions.appendChild(del)

    row.append(date, cat, amt, actions)
    frag.appendChild(row)
  }
  itemsEl.appendChild(frag)
}

async function refresh() {
  setStatus('')
  const month = monthEl.value
  if (!month) return
  const res = await apiGetExpenses(month)
  if (!res.ok) {
    totalEl.textContent = '—'
    renderItems([])
    setStatus(
      `${res.error}. If you're running Vite (port 5173), set VITE_API_BASE=http://127.0.0.1:8787 or open the app at http://localhost:8787.`,
    )
    return
  }
  totalEl.textContent = formatMoney(res.totalCents)
  renderItems(res.items)
}

monthEl.addEventListener('change', async () => {
  // Keep date inside selected month (best-effort)
  if (dateEl.value && monthFromDate(dateEl.value) !== monthEl.value) {
    dateEl.value = `${monthEl.value}-01`
  }
  await refresh()
})

dateEl.addEventListener('change', async () => {
  if (!dateEl.value) return
  const m = monthFromDate(dateEl.value)
  if (monthEl.value !== m) {
    monthEl.value = m
  }
  await refresh()
})

formEl.addEventListener('submit', async (e) => {
  e.preventDefault()
  setStatus('')

  const date = dateEl.value
  const category = categoryEl.value.trim()
  const amount = Number(amountEl.value.replace(/,/g, '').trim())
  const note = noteEl.value.trim()

  if (!date) return setStatus('Date is required')
  if (!category) return setStatus('Category is required')
  if (!Number.isFinite(amount) || amount === 0) return setStatus('Amount must be non-zero')

  setLoading(true)
  try {
    const res = await apiCreateExpense({ date, category, amount, note: note || undefined })
    if (!res.ok) {
      setStatus(res.error)
      return
    }

    // Ensure we refresh the month that the expense belongs to.
    const postedMonth = monthFromDate(date)
    if (monthEl.value !== postedMonth) monthEl.value = postedMonth

    // Reset amount & note; keep category/date for quick entry.
    amountEl.value = ''
    noteEl.value = ''
    await refresh()
  } finally {
    setLoading(false)
  }
})

// Init defaults
dateEl.value = todayIsoDate()
monthEl.value = monthFromDate(dateEl.value)
void refresh()
