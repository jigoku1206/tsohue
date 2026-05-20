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
import { parseRecurringForm, parseTransactionForm } from '@/lib/validation'

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
    await supabase.from('transactions').upsert(toInsert, {
      onConflict: 'recurring_id,date',
      ignoreDuplicates: true,
    })
  }
}

// ── Public server actions ─────────────────────────────────────────────────────

export async function createRecurringRule(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登入' }

  const parsed = parseRecurringForm(formData)
  if (!parsed.ok) return { error: parsed.error }

  let endDate: string | null = null
  if (parsed.value.count !== 'indefinite') {
    const dates = generateRecurringDates(parsed.value.date, parsed.value.frequency, parsed.value.count)
    endDate = dates[dates.length - 1]
  }

  const { error } = await supabase.from('recurring_rules').insert({
    user_id: user.id,
    ledger_id: parsed.value.ledger_id,
    amount: parsed.value.amount,
    currency: parsed.value.currency,
    exchange_rate: parsed.value.exchange_rate,
    category: parsed.value.category,
    subcategory: parsed.value.subcategory,
    note: parsed.value.note,
    paid_by: parsed.value.paid_by,
    frequency: parsed.value.frequency,
    start_date: parsed.value.date,
    end_date: endDate,
  })

  if (error) return { error: error.message }

  const [y, m] = parsed.value.date.split('-').map(Number)
  await ensureRecurringForMonth(supabase, user.id, y, m, parsed.value.ledger_id ?? undefined)

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

  const parsed = parseTransactionForm(formData)
  if (!parsed.ok) return { error: parsed.error }

  const newFields = {
    amount: parsed.value.amount,
    currency: parsed.value.currency,
    exchange_rate: parsed.value.exchange_rate,
    category: parsed.value.category,
    subcategory: parsed.value.subcategory,
    note: parsed.value.note,
    paid_by: parsed.value.paid_by,
  }
  const newDate = parsed.value.date

  if (scope === 'all') {
    const { error: ruleError } = await supabase.from('recurring_rules').update(newFields).eq('id', ruleId)
    if (ruleError) return { error: ruleError.message }

    const { error: txError } = await supabase
      .from('transactions')
      .update(newFields)
      .eq('recurring_id', ruleId)
      .eq('user_id', user.id)
    if (txError) return { error: txError.message }
  } else {
    // from_date scope
    const prev = prevOccurrence(rule.start_date, rule.frequency, fromDate)

    if (prev === null) {
      // fromDate <= start_date: update rule in place with new start
      const { error: ruleError } = await supabase.from('recurring_rules')
        .update({ ...newFields, start_date: newDate })
        .eq('id', ruleId)
      if (ruleError) return { error: ruleError.message }

      const { error: txError } = await supabase
        .from('transactions')
        .update(newFields)
        .eq('recurring_id', ruleId)
        .eq('user_id', user.id)
      if (txError) return { error: txError.message }
    } else {
      // Truncate old rule
      const { error: truncateError } = await supabase
        .from('recurring_rules')
        .update({ end_date: prev })
        .eq('id', ruleId)
      if (truncateError) return { error: truncateError.message }

      // Create new rule from fromDate
      const { data: newRule, error: insertError } = await supabase
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
      if (insertError) return { error: insertError.message }

      if (newRule) {
        const { error: txError } = await supabase
          .from('transactions')
          .update({ recurring_id: newRule.id, ...newFields })
          .eq('recurring_id', ruleId)
          .gte('date', fromDate)
          .eq('user_id', user.id)
        if (txError) return { error: txError.message }
      }
    }
  }

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
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .eq('recurring_id', ruleId)
      .eq('user_id', user.id)
    if (txError) return { error: txError.message }

    const { error: ruleError } = await supabase.from('recurring_rules').delete().eq('id', ruleId)
    if (ruleError) return { error: ruleError.message }
  } else {
    const { error: txError } = await supabase.from('transactions').delete()
      .eq('recurring_id', ruleId)
      .gte('date', fromDate)
      .eq('user_id', user.id)
    if (txError) return { error: txError.message }

    const prev = prevOccurrence(rule.start_date, rule.frequency, fromDate)

    if (prev === null) {
      // Nothing before fromDate — delete the whole rule
      const { error: ruleError } = await supabase.from('recurring_rules').delete().eq('id', ruleId)
      if (ruleError) return { error: ruleError.message }
    } else {
      const { error: ruleError } = await supabase
        .from('recurring_rules')
        .update({ end_date: prev })
        .eq('id', ruleId)
      if (ruleError) return { error: ruleError.message }
    }
  }

  revalidatePath('/dashboard')
  return { error: null }
}
