import { CURRENCIES, type CurrencyCode } from '@/lib/currencies'

const CURRENCY_CODES = new Set<string>(CURRENCIES.map((c) => c.code))
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export type TransactionInput = {
  date: string
  amount: number
  currency: CurrencyCode
  exchange_rate: number
  category: string
  subcategory: string | null
  note: string | null
  paid_by: string
  ledger_id: string | null
}

export type RecurringInput = TransactionInput & {
  frequency: 'monthly' | 'weekly'
  count: number | 'indefinite'
}

function fail<T>(error: string): ValidationResult<T> {
  return { ok: false, error }
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalText(value: FormDataEntryValue | null, max: number): string | null {
  const s = text(value)
  if (!s) return null
  return s.slice(0, max)
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export function parseLedgerId(value: FormDataEntryValue | string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const id = value.trim()
  return id && isUuid(id) ? id : null
}

export function parseDate(value: string): string | null {
  if (!DATE_RE.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10) === value ? value : null
}

export function parseMonth(year: number, month: number): ValidationResult<{ year: number; month: number }> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail('年份不正確')
  if (!Number.isInteger(month) || month < 1 || month > 12) return fail('月份不正確')
  return { ok: true, value: { year, month } }
}

export function parseTransactionForm(formData: FormData): ValidationResult<TransactionInput> {
  const date = parseDate(text(formData.get('date')))
  if (!date) return fail('日期格式不正確')

  const amount = Number.parseFloat(text(formData.get('amount')))
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) return fail('金額不正確')

  const currency = text(formData.get('currency')) || 'TWD'
  if (!CURRENCY_CODES.has(currency)) return fail('幣別不支援')

  const exchangeRate = Number.parseFloat(text(formData.get('exchange_rate'))) || 1
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0 || exchangeRate > 99999999.9999) {
    return fail('匯率不正確')
  }

  const category = text(formData.get('category'))
  if (!category || category.length > 60) return fail('類別不正確')

  const paidBy = text(formData.get('paid_by'))
  if (!paidBy || paidBy.length > 80) return fail('付款人不正確')

  const ledgerId = parseLedgerId(formData.get('ledger_id'))

  return {
    ok: true,
    value: {
      date,
      amount,
      currency: currency as CurrencyCode,
      exchange_rate: exchangeRate,
      category,
      subcategory: optionalText(formData.get('subcategory'), 60),
      note: optionalText(formData.get('note'), 500),
      paid_by: paidBy,
      ledger_id: ledgerId,
    },
  }
}

export function parseRecurringForm(formData: FormData): ValidationResult<RecurringInput> {
  const parsed = parseTransactionForm(formData)
  if (!parsed.ok) return parsed

  const frequency = text(formData.get('recurring_frequency'))
  if (frequency !== 'monthly' && frequency !== 'weekly') return fail('週期格式不正確')

  const rawCount = text(formData.get('recurring_count'))
  let count: number | 'indefinite' = 'indefinite'
  if (rawCount !== 'indefinite') {
    const n = Number.parseInt(rawCount, 10)
    if (!Number.isInteger(n) || n < 1 || n > 120) return fail('期數不正確')
    count = n
  }

  return { ok: true, value: { ...parsed.value, frequency, count } }
}

export function normalizeImportRow(row: {
  date: string
  amount: number
  currency: string
  exchange_rate: number
  category: string
  subcategory: string
  paid_by: string
  note: string
}): ValidationResult<Omit<TransactionInput, 'ledger_id'>> {
  const date = parseDate(String(row.date ?? '').trim())
  if (!date) return fail('CSV 包含不正確的日期')

  const amount = Number(row.amount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) {
    return fail('CSV 包含不正確的金額')
  }

  const currency = String(row.currency || 'TWD').trim().toUpperCase()
  if (!CURRENCY_CODES.has(currency)) return fail(`CSV 包含不支援的幣別：${currency}`)

  const exchangeRate = Number(row.exchange_rate || 1)
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0 || exchangeRate > 99999999.9999) {
    return fail('CSV 包含不正確的匯率')
  }

  const category = String(row.category ?? '').trim()
  if (!category || category.length > 60) return fail('CSV 包含不正確的類別')

  const paidBy = String(row.paid_by ?? '').trim()
  if (!paidBy || paidBy.length > 80) return fail('CSV 包含不正確的付款人')

  const subcategory = String(row.subcategory ?? '').trim()
  const note = String(row.note ?? '').trim()

  return {
    ok: true,
    value: {
      date,
      amount,
      currency: currency as CurrencyCode,
      exchange_rate: exchangeRate,
      category,
      subcategory: subcategory ? subcategory.slice(0, 60) : null,
      paid_by: paidBy,
      note: note ? note.slice(0, 500) : null,
    },
  }
}
