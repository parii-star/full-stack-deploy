export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export function monthFromDate(dateStr: string): string {
  // Accepts YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('date must be YYYY-MM-DD')
  }
  return dateStr.slice(0, 7)
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function parseMonthOrDefault(maybe: string | null): string {
  if (!maybe) return monthFromDate(todayIsoDate())
  if (!/^\d{4}-\d{2}$/.test(maybe)) throw new Error('month must be YYYY-MM')
  return maybe
}

export function amountToCents(amount: unknown): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) throw new Error('amount must be a number')
  const cents = Math.round(amount * 100)
  if (!Number.isSafeInteger(cents)) throw new Error('amount is too large')
  return cents
}
