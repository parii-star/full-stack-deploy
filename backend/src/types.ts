export type ExpenseItem = {
  id: number
  date: string
  month: string
  amountCents: number
  category: string
  note: string | null
  createdAt: string
}

export type ExpensesListResponse =
  | { ok: true; month: string; totalCents: number; items: ExpenseItem[] }
  | { ok: false; error: string }

export type CreateExpenseResponse =
  | { ok: true; item: ExpenseItem }
  | { ok: false; error: string }
