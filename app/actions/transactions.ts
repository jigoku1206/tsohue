'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureRecurringForMonth } from '@/app/actions/recurring'

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

  const subcategory = (formData.get('subcategory') as string) || null
  const ledgerId = (formData.get('ledger_id') as string) || null
  const currency = (formData.get('currency') as string) || 'TWD'
  const exchangeRate = parseFloat(formData.get('exchange_rate') as string) || 1
  const { error } = await supabase.from('transactions').insert({
    date: formData.get('date') as string,
    amount: parseFloat(formData.get('amount') as string),
    currency,
    exchange_rate: exchangeRate,
    category: formData.get('category') as string,
    subcategory,
    note: (formData.get('note') as string) || null,
    paid_by: formData.get('paid_by') as string,
    user_id: user.id,
    ledger_id: ledgerId,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}

async function getIsAdmin(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ?? false
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const admin = await getIsAdmin(supabase)
  const currency = (formData.get('currency') as string) || 'TWD'
  const exchangeRate = parseFloat(formData.get('exchange_rate') as string) || 1

  let query = supabase
    .from('transactions')
    .update({
      date: formData.get('date') as string,
      amount: parseFloat(formData.get('amount') as string),
      currency,
      exchange_rate: exchangeRate,
      category: formData.get('category') as string,
      subcategory: (formData.get('subcategory') as string) || null,
      note: (formData.get('note') as string) || null,
      paid_by: formData.get('paid_by') as string,
    })
    .eq('id', id)

  if (!admin) query = query.eq('user_id', user.id)

  const { error } = await query
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const admin = await getIsAdmin(supabase)

  let query = supabase.from('transactions').delete().eq('id', id)
  if (!admin) query = query.eq('user_id', user.id)

  const { error } = await query
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { error: null }
}
