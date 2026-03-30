'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  occurrencesInMonth,
  prevOccurrence,
  generateRecurringDates,
  lastDayOfMonth,
} from '@/lib/recurring-utils'

export type RecurringRule = {
  id: string
  user_id: string
  ledger_id: string | null
  amount: number
  currency: string
  exchange_rate: number
  category: string
  subcategory: string | null
  note: string | null
  paid_by: string
  frequency: 'monthly' | 'weekly'
  start_date: string
  end_date: string | null
  created_at: string
}

// ── Internal helper ───────────────────────────────────────────────────────────

export async function ensureRecurringForMonth(
  supabase: SupabaseClient,
  userId: string,
  year: number,
  month: number,
  ledgerId?: string
): Promise<void> {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = lastDayOfMonth(year, month)

  let rulesQuery = supabase
    .from('recurring_rules')
    .select('*')
    .eq('user_id', userId)
    .lte('start_date', monthEnd)
    .or(`end_date.is.null,end_date.gte.${monthStart}`)

  if (ledgerId) rulesQuery = rulesQuery.eq('ledger_id', ledgerId)

  const { data: rules } = await rulesQuery
  if (!rules || rules.length === 0) return

  const ruleIds = rules.map((r: RecurringRule) => r.id)

  const { data: existing } = await supabase
    .from('transactions')
    .select('recurring_id, date')
    .in('recurring_id', ruleIds)
    .gte('date', monthStart)
    .lte('date', monthEnd)

  const existingSet = new Set(
    (existing ?? []).map((tx: { recurring_id: string; date: string }) => `${tx.recurring_id}|${tx.date}`)
  )

  const toInsert: object[] = []
  for (const rule of rules as RecurringRule[]) {
    const dates = occurrencesInMonth(rule.start_date, rule.end_date, rule.frequency, year, month)
    for (const date of dates) {
      if (!existingSet.has(`${rule.id}|${date}`)) {
        toInsert.push({
          date,
          amount: rule.amount,
          currency: rule.currency,
          exchange_rate: rule.exchange_rate,
          category: rule.category,
          subcategory: rule.subcategory,
          note: rule.note,
          paid_by: rule.paid_by,
          user_id: userId,
          ledger_id: rule.ledger_id,
          recurring_id: rule.id,
        })
      }
    }
  }

  if (toInsert.length > 0) {
    await supabase.from('transactions').insert(toInsert)
  }
}

// ── Public server actions ─────────────────────────────────────────────────────

export async function createRecurringRule(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const startDate = formData.get('date') as string
  const frequency = formData.get('recurring_frequency') as 'monthly' | 'weekly'
  const rawCount = formData.get('recurring_count') as string
  const amount = parseFloat(formData.get('amount') as string)
  const currency = (formData.get('currency') as string) || 'TWD'
  const exchangeRate = parseFloat(formData.get('exchange_rate') as string) || 1
  const category = formData.get('category') as string
  const subcategory = (formData.get('subcategory') as string) || null
  const note = (formData.get('note') as string) || null
  const paidBy = formData.get('paid_by') as string
  const ledgerId = (formData.get('ledger_id') as string) || null

  let endDate: string | null = null
  if (rawCount !== 'indefinite') {
    const count = parseInt(rawCount) || 3
    const dates = generateRecurringDates(startDate, frequency, count)
    endDate = dates[dates.length - 1]
  }

  const { error } = await supabase.from('recurring_rules').insert({
    user_id: user.id,
    ledger_id: ledgerId,
    amount,
    currency,
    exchange_rate: exchangeRate,
    category,
    subcategory,
    note,
    paid_by: paidBy,
    frequency,
    start_date: startDate,
    end_date: endDate,
  })

  if (error) return { error: error.message }

  const [y, m] = startDate.split('-').map(Number)
  await ensureRecurringForMonth(supabase, user.id, y, m, ledgerId ?? undefined)

  revalidatePath('/dashboard')
  return { error: null }
}

export async function updateRecurringByScope(
  ruleId: string,
  fromDate: string,
  scope: 'all' | 'from_date',
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const { data: rule } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('user_id', user.id)
    .single()

  if (!rule) return { error: '找不到週期規則' }

  const amount = parseFloat(formData.get('amount') as string)
  const currency = (formData.get('currency') as string) || 'TWD'
  const exchangeRate = parseFloat(formData.get('exchange_rate') as string) || 1
  const category = formData.get('category') as string
  const subcategory = (formData.get('subcategory') as string) || null
  const note = (formData.get('note') as string) || null
  const paidBy = formData.get('paid_by') as string
  const newDate = formData.get('date') as string

  const newFields = { amount, currency, exchange_rate: exchangeRate, category, subcategory, note, paid_by: paidBy }
  const txFields = { ...newFields, date: undefined } // date updated individually only for 'all' date change

  if (scope === 'all') {
    await supabase.from('recurring_rules').update(newFields).eq('id', ruleId)
    await supabase.from('transactions').update(newFields).eq('recurring_id', ruleId).eq('user_id', user.id)
  } else {
    // from_date scope
    const prev = prevOccurrence(rule.start_date, rule.frequency, fromDate)

    if (prev === null) {
      // fromDate <= start_date: update rule in place with new start
      await supabase.from('recurring_rules')
        .update({ ...newFields, start_date: newDate })
        .eq('id', ruleId)
      await supabase.from('transactions').update(newFields).eq('recurring_id', ruleId).eq('user_id', user.id)
    } else {
      // Truncate old rule
      await supabase.from('recurring_rules').update({ end_date: prev }).eq('id', ruleId)

      // Create new rule from fromDate
      const { data: newRule } = await supabase
        .from('recurring_rules')
        .insert({
          ...newFields,
          user_id: user.id,
          ledger_id: rule.ledger_id,
          frequency: rule.frequency,
          start_date: newDate,
          end_date: rule.end_date,
        })
        .select()
        .single()

      if (newRule) {
        await supabase
          .from('transactions')
          .update({ recurring_id: newRule.id, ...newFields })
          .eq('recurring_id', ruleId)
          .gte('date', fromDate)
          .eq('user_id', user.id)
      }
    }
  }

  // Suppress unused variable warning
  void txFields

  revalidatePath('/dashboard')
  return { error: null }
}

export async function deleteRecurringByScope(
  ruleId: string,
  fromDate: string,
  scope: 'all' | 'from_date'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const { data: rule } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('user_id', user.id)
    .single()

  if (!rule) return { error: '找不到週期規則' }

  if (scope === 'all') {
    // FK is ON DELETE SET NULL, so delete transactions first, then rule
    await supabase.from('transactions').delete().eq('recurring_id', ruleId).eq('user_id', user.id)
    await supabase.from('recurring_rules').delete().eq('id', ruleId)
  } else {
    await supabase.from('transactions').delete()
      .eq('recurring_id', ruleId)
      .gte('date', fromDate)
      .eq('user_id', user.id)

    const prev = prevOccurrence(rule.start_date, rule.frequency, fromDate)

    if (prev === null) {
      // Nothing before fromDate — delete the whole rule
      await supabase.from('recurring_rules').delete().eq('id', ruleId)
    } else {
      await supabase.from('recurring_rules').update({ end_date: prev }).eq('id', ruleId)
    }
  }

  revalidatePath('/dashboard')
  return { error: null }
}
