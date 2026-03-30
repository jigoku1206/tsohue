import type { Transaction } from '@/app/actions/transactions'
import type { Category } from '@/app/actions/categories'
import type { Ledger } from '@/app/actions/ledgers'
import type { RecurringRule } from '@/app/actions/recurring'

export type DemoProfile = {
  nickname: string
}

export type DemoState = {
  transactions: Transaction[]
  categories: Category[]
  ledgers: Ledger[]
  profile: DemoProfile
  recurring_rules: RecurringRule[]
}

const KEY = 'demo_state_v1'

export function loadState(): DemoState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Backfill recurring_rules for existing localStorage without this field
    return { recurring_rules: [], ...parsed } as DemoState
  } catch {
    return null
  }
}

export function saveState(state: DemoState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function clearState(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}
