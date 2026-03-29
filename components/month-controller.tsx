'use client'

import { useState, useTransition, useEffect } from 'react'
import { MonthPicker } from '@/components/month-picker'
import { DashboardTabs } from '@/components/dashboard-tabs'
import { getTransactions, type Transaction } from '@/app/actions/transactions'
import type { Category } from '@/app/actions/categories'

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
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [isPending, startTransition] = useTransition()

  // Sync transactions when server revalidates (e.g. after add/edit/delete)
  useEffect(() => {
    setTransactions(initialTransactions)
  }, [initialTransactions])

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

  const monthlyTotal = transactions.reduce(
    (sum, tx) => sum + tx.amount * (tx.exchange_rate ?? 1),
    0
  )

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <div className={`shrink-0 rounded-xl border bg-card px-4 py-3 flex items-center justify-between transition-opacity${isPending ? ' opacity-50' : ''}`}>
        <MonthPicker
          year={year}
          month={month}
          onNavigate={handleNavigate}
          onNavigateToToday={handleNavigateToToday}
        />
        <div className="text-right">
          <p className="text-xs text-muted-foreground">當月總支出</p>
          <p className="text-xl font-bold">
            {new Intl.NumberFormat('zh-TW', {
              style: 'currency',
              currency: 'TWD',
              minimumFractionDigits: 0,
            }).format(monthlyTotal)}
          </p>
        </div>
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
      />
    </div>
  )
}
