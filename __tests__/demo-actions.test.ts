import { describe, it, expect } from 'vitest'
import { demoEnsureRecurringForMonth } from '@/lib/demo/actions'
import { buildSeedState } from '@/lib/demo/seed'
import { DEMO_PUBLIC_LEDGER_ID } from '@/lib/demo/seed'
import type { DemoState } from '@/lib/demo/storage'
import type { RecurringRule } from '@/app/actions/recurring'

function makeRule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: 'rule-1',
    ledger_id: DEMO_PUBLIC_LEDGER_ID,
    start_date: '2024-01-15',
    end_date: null,
    frequency: 'monthly',
    amount: 1000,
    currency: 'TWD',
    exchange_rate: 1,
    category: '餐飲',
    subcategory: null,
    note: null,
    paid_by: '訪客',
    user_id: 'demo-user',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function stateWithRule(rule: RecurringRule): DemoState {
  const state = buildSeedState()
  return { ...state, recurring_rules: [rule] }
}

describe('demoEnsureRecurringForMonth', () => {
  it('returns same state if no recurring rules', () => {
    const state = buildSeedState()
    const result = demoEnsureRecurringForMonth(state, 2024, 1, DEMO_PUBLIC_LEDGER_ID)
    expect(result).toBe(state) // referential equality — no new object
  })

  it('generates a monthly transaction for the given month', () => {
    const state = stateWithRule(makeRule())
    const result = demoEnsureRecurringForMonth(state, 2024, 3, DEMO_PUBLIC_LEDGER_ID)
    const newTx = result.transactions.find((tx) => tx.date === '2024-03-15')
    expect(newTx).toBeDefined()
    expect(newTx!.recurring_id).toBe('rule-1')
    expect(newTx!.amount).toBe(1000)
  })

  it('is idempotent — does not duplicate transactions', () => {
    const state = stateWithRule(makeRule())
    const once = demoEnsureRecurringForMonth(state, 2024, 3, DEMO_PUBLIC_LEDGER_ID)
    const twice = demoEnsureRecurringForMonth(once, 2024, 3, DEMO_PUBLIC_LEDGER_ID)
    const count = twice.transactions.filter((tx) => tx.date === '2024-03-15' && tx.recurring_id === 'rule-1').length
    expect(count).toBe(1)
  })

  it('does not generate transactions before rule start_date', () => {
    const rule = makeRule({ start_date: '2024-03-15' })
    const state = stateWithRule(rule)
    const result = demoEnsureRecurringForMonth(state, 2024, 1, DEMO_PUBLIC_LEDGER_ID)
    // start is March, querying January — no transactions
    expect(result).toBe(state)
    expect(result.transactions).toHaveLength(0)
  })

  it('does not generate transactions after rule end_date', () => {
    const rule = makeRule({ start_date: '2024-01-15', end_date: '2024-02-14' })
    const state = stateWithRule(rule)
    const result = demoEnsureRecurringForMonth(state, 2024, 3, DEMO_PUBLIC_LEDGER_ID)
    expect(result).toBe(state)
    expect(result.transactions).toHaveLength(0)
  })

  it('filters rules by ledgerId', () => {
    const rule = makeRule({ ledger_id: 'other-ledger' })
    const state = stateWithRule(rule)
    const result = demoEnsureRecurringForMonth(state, 2024, 3, DEMO_PUBLIC_LEDGER_ID)
    expect(result).toBe(state)
    expect(result.transactions).toHaveLength(0)
  })

  it('generates weekly transactions — multiple per month', () => {
    const rule = makeRule({ frequency: 'weekly', start_date: '2024-01-01' })
    const state = stateWithRule(rule)
    const result = demoEnsureRecurringForMonth(state, 2024, 1, DEMO_PUBLIC_LEDGER_ID)
    // Jan 2024 Mondays: 1, 8, 15, 22, 29
    const dates = result.transactions.map((tx) => tx.date).sort()
    expect(dates).toEqual(['2024-01-01', '2024-01-08', '2024-01-15', '2024-01-22', '2024-01-29'])
  })

  it('clamps monthly end-of-month correctly (Jan 31 → Feb 29 in 2024)', () => {
    const rule = makeRule({ start_date: '2024-01-31' })
    const state = stateWithRule(rule)
    const result = demoEnsureRecurringForMonth(state, 2024, 2, DEMO_PUBLIC_LEDGER_ID)
    const dates = result.transactions.map((tx) => tx.date)
    expect(dates).toContain('2024-02-29')
  })

  it('generated transaction has correct fields', () => {
    const rule = makeRule({ amount: 500, category: '交通', note: 'MRT', paid_by: '小明' })
    const state = stateWithRule(rule)
    const result = demoEnsureRecurringForMonth(state, 2024, 3, DEMO_PUBLIC_LEDGER_ID)
    const tx = result.transactions[0]
    expect(tx.amount).toBe(500)
    expect(tx.category).toBe('交通')
    expect(tx.note).toBe('MRT')
    expect(tx.paid_by).toBe('小明')
    expect(tx.ledger_id).toBe(DEMO_PUBLIC_LEDGER_ID)
    expect(tx.recurring_id).toBe('rule-1')
  })

  it('handles null ledgerId — processes all active rules', () => {
    const rule = makeRule()
    const state = stateWithRule(rule)
    const result = demoEnsureRecurringForMonth(state, 2024, 3, null)
    expect(result.transactions).toHaveLength(1)
  })
})
