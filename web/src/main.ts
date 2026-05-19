type Expense = {
  id: number
  date: string
  category: string
  amount: number
  note?: string
}

function mustGet<T extends Element>(selector: string): T {
  const el = document.querySelector(selector)
  if (!el) throw new Error(`Missing element: ${selector}`)
  return el as T
}

const apiBase = "http://j8fkxjx83wp7l9me37yqqqd7.34.14.175.63.sslip.io"

function apiUrl(path: string) {
  return apiBase ? `${apiBase}${path}` : path
}

const monthInput = mustGet<HTMLInputElement>('#month')
const totalEl = mustGet<HTMLSpanElement>('#total')
const tbody = mustGet<HTMLTableSectionElement>('#rows')

const form = mustGet<HTMLFormElement>('#expense-form')
const dateInput = mustGet<HTMLInputElement>('#date')
const categoryInput = mustGet<HTMLInputElement>('#category')
const amountInput = mustGet<HTMLInputElement>('#amount')
const noteInput = mustGet<HTMLInputElement>('#note')

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

monthInput.value = currentMonth()
dateInput.value = new Date().toISOString().slice(0, 10)

async function loadExpenses() {
  const month = monthInput.value

  const res = await fetch(apiUrl(`/api/expenses?month=${month}`))
  const data = await res.json()

  renderExpenses(data.expenses || [])
}

function renderExpenses(expenses: Expense[]) {
  tbody.innerHTML = ''

  let total = 0

  for (const exp of expenses) {
    total += Number(exp.amount)

    const tr = document.createElement('tr')

    tr.innerHTML = `
      <td>${exp.date}</td>
      <td>${exp.category}</td>
      <td>₹${Number(exp.amount).toFixed(2)}</td>
      <td>
        <button data-id="${exp.id}">
          🗑
        </button>
      </td>
    `

    const btn = tr.querySelector('button')!

    btn.addEventListener('click', async () => {
      await fetch(apiUrl(`/api/expenses/${exp.id}`), {
        method: 'DELETE',
      })

      loadExpenses()
    })

    tbody.appendChild(tr)
  }

  totalEl.textContent = `₹${total.toFixed(2)}`
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const payload = {
    date: dateInput.value,
    category: categoryInput.value,
    amount: Number(amountInput.value),
    note: noteInput.value,
  }

  await fetch(apiUrl('/api/expenses'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  form.reset()

  dateInput.value = new Date().toISOString().slice(0, 10)

  loadExpenses()
})

monthInput.addEventListener('change', loadExpenses)

loadExpenses()