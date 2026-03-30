'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type LedgerBudget = {
  id: string
  ledger_id: string
  category: string | null // null = total monthly budget
  monthly_limit: number
}

export async function getLedgerBudgets(ledgerId: string): Promise<LedgerBudget[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ledger_budgets')
    .select('id, ledger_id, category, monthly_limit')
    .eq('ledger_id', ledgerId)
  return data ?? []
}

export async function upsertLedgerBudget(
  ledgerId: string,
  category: string | null,
  limit: number | null
): Promise<{ error?: string }> {
  const supabase = await createClient()

  if (!limit || limit <= 0) {
    const base = supabase.from('ledger_budgets').delete().eq('ledger_id', ledgerId)
    const { error } = await (category === null ? base.is('category', null) : base.eq('category', category))
    if (error) return { error: error.message }
  } else {
    // Try update first, then insert if nothing matched (avoids NULL unique-key upsert issue)
    const updateBase = supabase
      .from('ledger_budgets')
      .update({ monthly_limit: limit })
      .eq('ledger_id', ledgerId)
    const { data: updated, error: updateErr } = await (
      category === null ? updateBase.is('category', null) : updateBase.eq('category', category)
    ).select('id')
    if (updateErr) return { error: updateErr.message }

    if (!updated || updated.length === 0) {
      const { error: insertErr } = await supabase
        .from('ledger_budgets')
        .insert({ ledger_id: ledgerId, category, monthly_limit: limit })
      if (insertErr) return { error: insertErr.message }
    }
  }

  revalidatePath('/dashboard')
  return {}
}
