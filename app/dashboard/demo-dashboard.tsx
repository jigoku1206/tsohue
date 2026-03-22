'use client'

import { useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ActionsContext } from '@/lib/actions-context'
import { createDemoActions } from '@/lib/demo/actions'
import { buildSeedState, DEMO_PUBLIC_LEDGER_ID, DEMO_USER_ID } from '@/lib/demo/seed'
import { loadState, saveState } from '@/lib/demo/storage'
import type { DemoState } from '@/lib/demo/storage'
import { DashboardTabs } from '@/components/dashboard-tabs'
import { CategoryManager } from '@/components/category-manager'
import { MonthPicker } from '@/components/month-picker'
import { LedgerManager } from '@/components/ledger-manager'
import { DemoBanner } from '@/components/demo-banner'
import { DemoProfileDialog } from '@/components/demo-profile-dialog'

function loadOrSeed(): DemoState {
  return loadState() ?? buildSeedState()
}

export function DemoDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const now = new Date()
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : now.getFullYear()
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : now.getMonth() + 1
  const ledgerParam = searchParams.get('ledger')

  const [state, setState] = useState<DemoState>(loadOrSeed)

  const actions = useMemo(() => createDemoActions(setState), [])

  // Resolve current ledger
  const publicLedger = state.ledgers.find((l) => l.is_public)
  const currentLedger = ledgerParam
    ? (state.ledgers.find((l) => l.id === ledgerParam) ?? publicLedger)
    : publicLedger

  // Filter transactions for current month + ledger
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
  const transactions = useMemo(
    () =>
      state.transactions.filter(
        (tx) => tx.ledger_id === currentLedger?.id && tx.date.startsWith(monthPrefix)
      ),
    [state.transactions, currentLedger?.id, monthPrefix]
  )

  const monthlyTotal = transactions.reduce(
    (sum, tx) => sum + tx.amount * (tx.exchange_rate ?? 1),
    0
  )

  function handleReset() {
    const fresh = buildSeedState()
    saveState(fresh)
    setState(fresh)
    // Navigate back to current month on public ledger
    router.push(`/dashboard?ledger=${DEMO_PUBLIC_LEDGER_ID}`)
  }

  return (
    <ActionsContext.Provider value={actions}>
      <div className="max-w-2xl mx-auto w-full p-4 flex flex-col gap-3">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/tsohue.jpg"
              alt="做伙"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
            <span className="text-2xl font-bold">做伙</span>
          </div>
          <div className="flex items-center gap-1">
            <LedgerManager
              ledgers={state.ledgers}
              currentLedgerId={currentLedger?.id ?? DEMO_PUBLIC_LEDGER_ID}
              currentUserId={DEMO_USER_ID}
            />
            <CategoryManager initialCategories={state.categories} />
            <DemoProfileDialog nickname={state.profile.nickname} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('確定要登出 Demo 模式？')) router.push('/')
              }}
            >
              登出
            </Button>
          </div>
        </header>

        {/* Demo banner */}
        <DemoBanner onReset={handleReset} />

        {/* Monthly summary */}
        <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between">
          <MonthPicker year={year} month={month} ledgerId={currentLedger?.id} />
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

        {/* Calendar / Report tabs */}
        <DashboardTabs
          year={year}
          month={month}
          transactions={transactions}
          categories={state.categories}
          currentUserId={DEMO_USER_ID}
          userNickname={state.profile.nickname}
          ledgerId={currentLedger?.id}
          defaultCurrency={currentLedger?.default_currency}
          isAdmin
        />
      </div>
    </ActionsContext.Provider>
  )
}
