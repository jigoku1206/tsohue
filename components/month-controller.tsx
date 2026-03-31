'use client'

import { useState, useTransition, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { MonthPicker } from '@/components/month-picker'
import { DashboardTabs } from '@/components/dashboard-tabs'
import { getTransactions, type Transaction } from '@/app/actions/transactions'
import type { Category } from '@/app/actions/categories'
import { useActions } from '@/lib/actions-context'

export function MonthController({
  initialYear,
  initialMonth,
  initialTransactions,
  categories,
  currentUserId,
  userNickname,
  ledgerId,
  defaultCurrency,
  isAdmin,
}: {
  initialYear: number
  initialMonth: number
  initialTransactions: Transaction[]
  categories: Category[]
  currentUserId: string
  userNickname: string
  ledgerId?: string
  defaultCurrency?: string
  isAdmin?: boolean
}) {
  const { getLedgerBudgets } = useActions()
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [isPending, startTransition] = useTransition()
  const [totalBudget, setTotalBudget] = useState<number | null>(null)

  // Sync transactions when server revalidates (e.g. after add/edit/delete)
  useEffect(() => {
    setTransactions(initialTransactions)
  }, [initialTransactions])

  // Re-fetch total budget when ledger changes or server revalidates
  useEffect(() => {
    if (!ledgerId) return
    getLedgerBudgets(ledgerId).then((bs) => {
      const b = bs.find((b) => b.category === null)
      setTotalBudget(b?.monthly_limit ?? null)
    })
  }, [ledgerId, initialTransactions])

  function navigateTo(y: number, m: number) {
    startTransition(async () => {
      const newTransactions = await getTransactions(y, m, ledgerId)
      setYear(y)
      setMonth(m)
      setTransactions(newTransactions)
      const ledgerQuery = ledgerId ? `&ledger=${ledgerId}` : ''
      window.history.replaceState(null, '', `/dashboard?year=${y}&month=${m}${ledgerQuery}`)
    })
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
    const newTransactions = await getTransactions(year, month, ledgerId)
    setTransactions(newTransactions)
  }

  const monthlyTotal = transactions.reduce(
    (sum, tx) => sum + tx.amount * (tx.exchange_rate ?? 1),
    0
  )

  const totalWarning = !totalBudget ? null
    : monthlyTotal / totalBudget >= 1 ? 'over' as const
    : monthlyTotal / totalBudget >= 0.8 ? 'near' as const
    : null

  const [showBudget, setShowBudget] = useState(false)

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <div className={`shrink-0 rounded-xl border bg-card px-4 py-3 flex items-center justify-between transition-opacity${isPending ? ' opacity-50' : ''}`}>
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
      />
    </div>
  )
}
