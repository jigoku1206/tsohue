'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { normalizeImportRow, parseLedgerId } from '@/lib/validation'

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

  const normalizedLedgerId = parseLedgerId(ledgerId)
  if (ledgerId && !normalizedLedgerId) {
    return { imported: 0, error: '帳本格式不正確' }
  }

  if (normalizedLedgerId) {
    const { data: ledger } = await supabase
      .from('ledgers')
      .select('id')
      .eq('id', normalizedLedgerId)
      .maybeSingle()
    if (!ledger) return { imported: 0, error: '無此帳本的匯入權限' }
  }

  const normalized = []
  for (const row of rows) {
    const parsed = normalizeImportRow(row)
    if (!parsed.ok) return { imported: 0, error: parsed.error }
    normalized.push(parsed.value)
  }

  const inserts = normalized.map((row) => ({
    user_id: user.id,
    ledger_id: normalizedLedgerId,
    ...row,
  }))

  const { error } = await supabase.from('transactions').insert(inserts)
  if (error) return { imported: 0, error: error.message }

  revalidatePath('/dashboard')
  return { imported: rows.length }
}
