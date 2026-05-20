'use client'

import { useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ActionsContext } from '@/lib/actions-context'
import { createDemoActions, demoEnsureRecurringForMonth } from '@/lib/demo/actions'
import { buildSeedState, DEMO_PUBLIC_LEDGER_ID, DEMO_USER_ID } from '@/lib/demo/seed'
import { loadState, saveState, type DemoState } from '@/lib/demo/storage'
import { DashboardTabs } from '@/components/dashboard-tabs'
import { CategoryManager } from '@/components/category-manager'
import { MonthPicker } from '@/components/month-picker'
import { LedgerManager } from '@/components/ledger-manager'
import { DemoBanner } from '@/components/demo-banner'
import { DemoProfileDialog } from '@/components/demo-profile-dialog'
import { AlertTriangle, LogOut } from 'lucide-react'

function loadOrSeed(): DemoState {
  return loadState() ?? buildSeedState()
}

export function DemoDashboard() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const now = new Date()
  const [year, setYear] = useState(() =>
    searchParams.get('year') ? parseInt(searchParams.get('year')!) : now.getFullYear()
  )
  const [month, setMonth] = useState(() =>
    searchParams.get('month') ? parseInt(searchParams.get('month')!) : now.getMonth() + 1
  )
  const [currentLedgerId, setCurrentLedgerId] = useState<string | null>(
    () => searchParams.get('ledger')
  )

  const [state, setState] = useState<DemoState>(loadOrSeed)

  const displayState = useMemo(() => {
    const ledgerId = currentLedgerId ?? (state.ledgers.find((l) => l.is_public)?.id ?? null)
    return demoEnsureRecurringForMonth(state, year, month, ledgerId)
  }, [currentLedgerId, month, state, year])

  const actions = useMemo(
    () => createDemoActions(setState, () => displayState),
    [displayState]
  )

  // Resolve current ledger
  const publicLedger = displayState.ledgers.find((l) => l.is_public)
  const currentLedger = currentLedgerId
    ? (displayState.ledgers.find((l) => l.id === currentLedgerId) ?? publicLedger)
    : publicLedger

  // Filter transactions for current month + ledger
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
  const transactions = useMemo(
    () =>
      displayState.transactions.filter(
        (tx) => tx.ledger_id === currentLedger?.id && tx.date.startsWith(monthPrefix)
      ),
    [displayState.transactions, currentLedger?.id, monthPrefix]
  )

  const monthlyTotal = transactions.reduce(
    (sum, tx) => sum + tx.amount * (tx.exchange_rate ?? 1),
    0
  )

  const totalBudget = displayState.ledger_budgets.find(
    (b) => b.ledger_id === currentLedger?.id && b.category === null
  )?.monthly_limit ?? null

  const totalWarning = !totalBudget ? null
    : monthlyTotal / totalBudget >= 1 ? 'over' as const
    : monthlyTotal / totalBudget >= 0.8 ? 'near' as const
    : null

  const [showBudget, setShowBudget] = useState(false)

  async function handleRefresh() {
    setState(loadOrSeed())
  }

  function handleReset() {
    const fresh = buildSeedState()
    saveState(fresh)
    setState(fresh)
    // Navigate back to current month on public ledger
    router.push(`/dashboard?ledger=${DEMO_PUBLIC_LEDGER_ID}`)
  }

  function handleNavigateToToday() {
    const n = new Date()
    setYear(n.getFullYear())
    setMonth(n.getMonth() + 1)
    const ledgerQuery = currentLedger?.id ? `&ledger=${currentLedger.id}` : ''
    window.history.replaceState(null, '', `/dashboard?year=${n.getFullYear()}&month=${n.getMonth() + 1}${ledgerQuery}`)
  }

  return (
    <ActionsContext.Provider value={actions}>
      <div className="fixed inset-0 overflow-hidden">
        <div className="max-w-2xl mx-auto h-full flex flex-col">
          {/* Header */}
          <header className="shrink-0 flex items-center justify-between gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pb-3 sm:pt-[max(1rem,env(safe-area-inset-top))]">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
              <Image
                src="/tsohue.jpg"
                alt="做伙"
                width={48}
                height={48}
                className="h-auto w-9 object-contain sm:w-12"
                priority
              />
              <span className="text-xl font-bold sm:text-2xl">做伙</span>
            </Link>
            <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
              <LedgerManager
                ledgers={displayState.ledgers}
                currentLedgerId={currentLedger?.id ?? DEMO_PUBLIC_LEDGER_ID}
                currentUserId={DEMO_USER_ID}
                onSwitchLedger={(id) => {
                  setCurrentLedgerId(id)
                  window.history.replaceState(null, '', `/dashboard?year=${year}&month=${month}&ledger=${id}`)
                }}
              />
              <CategoryManager initialCategories={displayState.categories} />
              <DemoProfileDialog nickname={displayState.profile.nickname} />
              <Button
                variant="ghost"
                size="icon"
                aria-label="登出 Demo 模式"
                title="登出 Demo 模式"
                className="h-9 w-9 sm:h-8 sm:w-auto sm:px-3"
                onClick={() => {
                  if (confirm('確定要登出 Demo 模式？')) router.push('/')
                }}
              >
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">登出</span>
              </Button>
            </div>
          </header>

        <div className="flex-1 min-h-0 flex flex-col gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Demo banner */}
          <DemoBanner onReset={handleReset} />

          {/* Monthly summary */}
          <div className="shrink-0 rounded-xl border bg-card px-3 py-2.5 flex items-center justify-between gap-2 sm:px-4 sm:py-3">
            <MonthPicker
              year={year}
              month={month}
              onNavigate={(delta) => {
                const d = new Date(year, month - 1 + delta, 1)
                const y = d.getFullYear()
                const m = d.getMonth() + 1
                setYear(y)
                setMonth(m)
                const ledgerQuery = currentLedger?.id ? `&ledger=${currentLedger.id}` : ''
                window.history.replaceState(null, '', `/dashboard?year=${y}&month=${m}${ledgerQuery}`)
              }}
              onNavigateToToday={handleNavigateToToday}
            />
            <button
              className="min-w-0 text-right select-none"
              onClick={() => totalBudget && setShowBudget((v) => !v)}
              style={{ cursor: totalBudget ? 'pointer' : 'default' }}
            >
              <p className="text-xs text-muted-foreground">當月總支出</p>
              <p className="flex items-center justify-end gap-1 text-lg font-bold sm:text-xl">
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

          {/* Calendar / Report tabs */}
          <DashboardTabs
            year={year}
            month={month}
            transactions={transactions}
            categories={displayState.categories}
            currentUserId={DEMO_USER_ID}
            userNickname={displayState.profile.nickname}
            ledgerId={currentLedger?.id}
            defaultCurrency={currentLedger?.default_currency}
            isAdmin
            onJumpToToday={handleNavigateToToday}
            onRefresh={handleRefresh}
            ledgerMembers={[{ id: DEMO_USER_ID, nickname: displayState.profile.nickname }]}
          />
        </div>
        </div>
      </div>
    </ActionsContext.Provider>
  )
}
