'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureRecurringForMonth } from '@/app/actions/recurring'
import { parseMonth, parseTransactionForm } from '@/lib/validation'

export type Transaction = {
  id: string
  date: string
  amount: number
  currency: string
  exchange_rate: number   // TWD per 1 unit of currency (1 for TWD)
  category: string
  subcategory: string | null
  note: string | null
  paid_by: string
  user_id: string
  ledger_id: string | null
  recurring_id: string | null
  created_at: string
}

export async function getTransactionsRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  ledgerId?: string
): Promise<Transaction[]> {
  const startMonthParsed = parseMonth(startYear, startMonth)
  const endMonthParsed = parseMonth(endYear, endMonth)
  if (!startMonthParsed.ok || !endMonthParsed.ok) return []

  const supabase = await createClient()
  const start = `${startYear}-${String(startMonth).padStart(2, '0')}-01`
  const endLastDay = new Date(endYear, endMonth, 0).getDate()
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endLastDay).padStart(2, '0')}`

  let query = supabase
    .from('transactions')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })

  if (ledgerId) query = query.eq('ledger_id', ledgerId)

  const { data, error } = await query
  if (error) return []
  return data ?? []
}

export async function getTransactions(
  year: number,
  month: number,
  ledgerId?: string
): Promise<Transaction[]> {
  const parsedMonth = parseMonth(year, month)
  if (!parsedMonth.ok) return []

  const supabase = await createClient()

  // Lazy-generate recurring transactions for this month before fetching
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await ensureRecurringForMonth(supabase, user.id, year, month, ledgerId)
  }

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  let query = supabase
    .from('transactions')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })

  if (ledgerId) {
    query = query.eq('ledger_id', ledgerId)
  }

  const { data, error } = await query
  if (error) return []
  return data ?? []
}

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '未登入' }

  const parsed = parseTransactionForm(formData)
  if (!parsed.ok) return { error: parsed.error }

  const { error } = await supabase.from('transactions').insert({
    date: parsed.value.date,
    amount: parsed.value.amount,
    currency: parsed.value.currency,
    exchange_rate: parsed.value.exchange_rate,
    category: parsed.value.category,
    subcategory: parsed.value.subcategory,
    note: parsed.value.note,
    paid_by: parsed.value.paid_by,
    user_id: user.id,
    ledger_id: parsed.value.ledger_id,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}

async function getIsAdmin(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  userId: string
): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
  return data?.is_admin ?? false
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const admin = await getIsAdmin(supabase, user.id)
  const parsed = parseTransactionForm(formData)
  if (!parsed.ok) return { error: parsed.error }

  let query = supabase
    .from('transactions')
    .update({
      date: parsed.value.date,
      amount: parsed.value.amount,
      currency: parsed.value.currency,
      exchange_rate: parsed.value.exchange_rate,
      category: parsed.value.category,
      subcategory: parsed.value.subcategory,
      note: parsed.value.note,
      paid_by: parsed.value.paid_by,
    })
    .eq('id', id)
    .select('id')

  if (!admin) query = query.eq('user_id', user.id)

  const { data, error } = await query
  if (error) return { error: error.message }
  if (!data?.length) return { error: '找不到消費記錄或無修改權限' }
  revalidatePath('/dashboard')
  return { error: null }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const admin = await getIsAdmin(supabase, user.id)

  let query = supabase.from('transactions').delete().eq('id', id)
  if (!admin) query = query.eq('user_id', user.id)

  const { data, error } = await query.select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: '找不到消費記錄或無刪除權限' }
  revalidatePath('/dashboard')
  return { error: null }
}
