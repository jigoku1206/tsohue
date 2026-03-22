'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ImportRow = {
  date: string
  amount: number
  currency: string
  exchange_rate: number
  category: string
  subcategory: string
  paid_by: string
  note: string
}

export async function importTransactions(
  rows: ImportRow[],
  ledgerId?: string
): Promise<{ imported: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, error: '未登入' }

  const inserts = rows.map((row) => ({
    user_id: user.id,
    ledger_id: ledgerId ?? null,
    date: row.date,
    amount: row.amount,
    currency: row.currency || 'TWD',
    exchange_rate: row.exchange_rate || 1,
    category: row.category,
    subcategory: row.subcategory || null,
    paid_by: row.paid_by || '',
    note: row.note || null,
  }))

  const { error } = await supabase.from('transactions').insert(inserts)
  if (error) return { imported: 0, error: error.message }

  revalidatePath('/dashboard')
  return { imported: rows.length }
}
