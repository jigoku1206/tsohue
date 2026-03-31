'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
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
import { AlertTriangle } from 'lucide-react'

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

  const stateRef = useRef(state)
  stateRef.current = state

  const actions = useMemo(() => createDemoActions(setState, () => stateRef.current), [])

  // Lazy-generate recurring transactions whenever month/ledger changes
  useEffect(() => {
    setState((prev) => {
      const ledgerId = currentLedgerId ?? (prev.ledgers.find((l) => l.is_public)?.id ?? null)
      return demoEnsureRecurringForMonth(prev, year, month, ledgerId)
    })
  }, [year, month, currentLedgerId])

  // Resolve current ledger
  const publicLedger = state.ledgers.find((l) => l.is_public)
  const currentLedger = currentLedgerId
    ? (state.ledgers.find((l) => l.id === currentLedgerId) ?? publicLedger)
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

  const totalBudget = state.ledger_budgets.find(
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
      <div className="max-w-2xl mx-auto w-full p-4 flex flex-col gap-3">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/tsohue.jpg"
              alt="做伙"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
            <span className="text-2xl font-bold">做伙</span>
          </Link>
          <div className="flex items-center gap-1">
            <LedgerManager
              ledgers={state.ledgers}
              currentLedgerId={currentLedger?.id ?? DEMO_PUBLIC_LEDGER_ID}
              currentUserId={DEMO_USER_ID}
              onSwitchLedger={(id) => {
                setCurrentLedgerId(id)
                window.history.replaceState(null, '', `/dashboard?year=${year}&month=${month}&ledger=${id}`)
              }}
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
          onJumpToToday={handleNavigateToToday}
          onRefresh={handleRefresh}
        />
      </div>
    </ActionsContext.Provider>
  )
}
