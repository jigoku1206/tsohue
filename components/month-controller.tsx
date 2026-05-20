'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { MonthPicker } from '@/components/month-picker'
import { DashboardTabs } from '@/components/dashboard-tabs'
import { getTransactions, type Transaction } from '@/app/actions/transactions'
import type { Category } from '@/app/actions/categories'
import { useActions } from '@/lib/actions-context'

export function MonthController({
  year,
  month,
  categories,
  currentUserId,
  userNickname,
  ledgerId,
  defaultCurrency,
  isAdmin,
  onDateChange,
}: {
  year: number
  month: number
  categories: Category[]
  currentUserId: string
  userNickname: string
  ledgerId?: string
  defaultCurrency?: string
  isAdmin?: boolean
  onDateChange: (year: number, month: number) => void
}) {
  const { getLedgerBudgets, getLedgerMembers } = useActions()
  const targetKey = `${ledgerId ?? 'none'}:${year}:${month}`
  const [transactionsState, setTransactionsState] = useState<{
    key: string
    transactions: Transaction[]
  }>({ key: '', transactions: [] })
  const [budgetState, setBudgetState] = useState<{
    key: string
    totalBudget: number | null
  }>({ key: '', totalBudget: null })
  const [membersState, setMembersState] = useState<{
    key: string
    members: { id: string; nickname: string }[]
  }>({ key: '', members: [] })
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    getTransactions(year, month, ledgerId).then((transactions) => {
      if (!cancelled) setTransactionsState({ key: targetKey, transactions })
    })
    return () => {
      cancelled = true
    }
  }, [ledgerId, month, refreshNonce, targetKey, year])

  useEffect(() => {
    if (!ledgerId) return
    getLedgerBudgets(ledgerId).then((bs) => {
      const b = bs.find((b) => b.category === null)
      setBudgetState({ key: ledgerId, totalBudget: b?.monthly_limit ?? null })
    })
  }, [getLedgerBudgets, ledgerId, refreshNonce])

  useEffect(() => {
    if (!ledgerId) return
    getLedgerMembers(ledgerId).then((members) => {
      setMembersState({
        key: ledgerId,
        members: members.map((m) => ({ id: m.user_id, nickname: m.nickname })),
      })
    })
  }, [getLedgerMembers, ledgerId])

  function navigateTo(y: number, m: number) {
    onDateChange(y, m)
  }

  function handleNavigate(deltaMonths: number) {
    const d = new Date(year, month - 1 + deltaMonths, 1)
    navigateTo(d.getFullYear(), d.getMonth() + 1)
  }

  function handleNavigateToToday() {
    const now = new Date()
    navigateTo(now.getFullYear(), now.getMonth() + 1)
  }

  async function handleRefresh() {
    setRefreshNonce((n) => n + 1)
  }

  const transactions = useMemo(
    () => (transactionsState.key === targetKey ? transactionsState.transactions : []),
    [targetKey, transactionsState.key, transactionsState.transactions]
  )
  const totalBudget = budgetState.key === ledgerId ? budgetState.totalBudget : null
  const ledgerMembers = membersState.key === ledgerId ? membersState.members : []
  const isLoadingTransactions = transactionsState.key !== targetKey
  const isLoading = isLoadingTransactions

  const monthlyTotal = useMemo(() => transactions.reduce(
    (sum, tx) => sum + tx.amount * (tx.exchange_rate ?? 1),
    0
  ), [transactions])

  const totalWarning = !totalBudget ? null
    : monthlyTotal / totalBudget >= 1 ? 'over' as const
    : monthlyTotal / totalBudget >= 0.8 ? 'near' as const
    : null

  const [showBudget, setShowBudget] = useState(false)

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <div className={`shrink-0 rounded-xl border bg-card px-4 py-3 flex items-center justify-between transition-opacity${isLoadingTransactions ? ' opacity-80' : ''}`}>
        <MonthPicker
          year={year}
          month={month}
          onNavigate={handleNavigate}
          onNavigateToToday={handleNavigateToToday}
        />
        <button
          className="text-right select-none"
          onClick={() => totalBudget && setShowBudget((v) => !v)}
          style={{ cursor: totalBudget ? 'pointer' : 'default' }}
        >
          <p className="text-xs text-muted-foreground">當月總支出</p>
          <p className="text-xl font-bold flex items-center justify-end gap-1">
            {new Intl.NumberFormat('zh-TW', {
              style: 'currency',
              currency: 'TWD',
              minimumFractionDigits: 0,
            }).format(monthlyTotal)}
            {isLoadingTransactions && (
              <span className="h-3 w-3 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
            )}
            {totalWarning && (
              <AlertTriangle className={`h-4 w-4 shrink-0 ${totalWarning === 'over' ? 'text-red-500' : 'text-yellow-500'}`} />
            )}
          </p>
          {showBudget && totalBudget && (
            <p className="text-xs text-muted-foreground mt-0.5">
              預算上限 {new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(totalBudget)}
            </p>
          )}
        </button>
      </div>

      <DashboardTabs
        year={year}
        month={month}
        transactions={transactions}
        categories={categories}
        currentUserId={currentUserId}
        userNickname={userNickname}
        ledgerId={ledgerId}
        defaultCurrency={defaultCurrency}
        isAdmin={isAdmin}
        onJumpToToday={handleNavigateToToday}
        onRefresh={handleRefresh}
        ledgerMembers={ledgerMembers}
        isLoading={isLoading}
      />
    </div>
  )
}
