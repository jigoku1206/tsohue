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

const MAX_IMPORT_ROWS = 1000

export async function importTransactions(
  rows: ImportRow[],
  ledgerId?: string
): Promise<{ imported: number; error?: string }> {
  if (rows.length > MAX_IMPORT_ROWS) {
    return { imported: 0, error: `單次最多匯入 ${MAX_IMPORT_ROWS} 筆，請分批匯入` }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, error: '未登入' }

  if (ledgerId) {
    const { data: ledger } = await supabase
      .from('ledgers')
      .select('id')
      .eq('id', ledgerId)
      .or(`owner_id.eq.${user.id},is_public.eq.true`)
      .maybeSingle()
    if (!ledger) return { imported: 0, error: '無此帳本的匯入權限' }
  }

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
