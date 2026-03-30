'use client'

import { createContext, useContext } from 'react'
import type { ExchangeRates } from '@/lib/currencies'
import type { LedgerMember, UserProfile } from '@/app/actions/ledgers'
import type { ImportRow } from '@/app/actions/import'

// ── Context type ─────────────────────────────────────────────────────────────

export interface ActionsContextValue {
  isDemo: boolean
  // transactions
  addTransaction: (formData: FormData) => Promise<{ error?: string | null }>
  updateTransaction: (id: string, formData: FormData) => Promise<{ error?: string | null }>
  deleteTransaction: (id: string) => Promise<{ error?: string | null }>
  // recurring
  createRecurringRule: (formData: FormData) => Promise<{ error?: string | null }>
  updateRecurringByScope: (ruleId: string, fromDate: string, scope: 'all' | 'from_date', formData: FormData) => Promise<{ error?: string | null }>
  deleteRecurringByScope: (ruleId: string, fromDate: string, scope: 'all' | 'from_date') => Promise<{ error?: string | null }>
  // categories
  createCategory: (name: string, parentId?: string) => Promise<{ error?: string | null }>
  updateCategory: (id: string, name: string) => Promise<{ error?: string | null }>
  deleteCategory: (id: string) => Promise<{ error?: string | null }>
  updateCategoryPositions: (updates: { id: string; position: number }[]) => Promise<{ error?: string | null }>
  // ledgers
  createLedger: (name: string) => Promise<{ id: string } | { error: string }>
  updateLedger: (id: string, name: string, currency?: string) => Promise<{ error?: string | null }>
  deleteLedger: (id: string) => Promise<{ error?: string | null }>
  getLedgerMembers: (ledgerId: string) => Promise<LedgerMember[]>
  getAllUsers: () => Promise<UserProfile[]>
  setLedgerMembers: (ledgerId: string, userIds: string[]) => Promise<{ error?: string | null }>
  // profile
  updateProfile: (_prev: { error: string } | null, formData: FormData) => Promise<{ error: string } | null>
  // exchange rates
  fetchExchangeRates: (date?: string) => Promise<ExchangeRates>
  // import
  importTransactions: (rows: ImportRow[], ledgerId?: string) => Promise<{ imported: number; error?: string }>
}

// ── Context ───────────────────────────────────────────────────────────────────

export const ActionsContext = createContext<ActionsContextValue | null>(null)

export function useActions(): ActionsContextValue {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error('useActions must be used within an ActionsProvider')
  return ctx
}

// ── Production provider ───────────────────────────────────────────────────────

import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/app/actions/transactions'
import {
  createRecurringRule,
  updateRecurringByScope,
  deleteRecurringByScope,
} from '@/app/actions/recurring'
import {
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryPositions,
} from '@/app/actions/categories'
import {
  createLedger,
  updateLedger,
  deleteLedger,
  getLedgerMembers,
  getAllUsers,
  setLedgerMembers,
} from '@/app/actions/ledgers'
import { updateProfile } from '@/app/actions/profile'
import { fetchExchangeRates } from '@/lib/fetch-exchange-rates'
import { importTransactions } from '@/app/actions/import'

const liveValue: ActionsContextValue = {
  isDemo: false,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  createRecurringRule,
  updateRecurringByScope,
  deleteRecurringByScope,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryPositions,
  createLedger,
  updateLedger,
  deleteLedger,
  getLedgerMembers,
  getAllUsers,
  setLedgerMembers,
  updateProfile,
  fetchExchangeRates,
  importTransactions,
}

export function LiveActionsProvider({ children }: { children: React.ReactNode }) {
  return <ActionsContext.Provider value={liveValue}>{children}</ActionsContext.Provider>
}
