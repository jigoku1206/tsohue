import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTransactions } from '@/app/actions/transactions'
import { getCategories } from '@/app/actions/categories'
import { getProfile } from '@/app/actions/profile'
import { getLedgers } from '@/app/actions/ledgers'
import { DashboardTabs } from '@/components/dashboard-tabs'
import { CategoryManager } from '@/components/category-manager'
import { MonthPicker } from '@/components/month-picker'
import { ProfileDialog } from '@/components/profile-dialog'
import { LedgerManager } from '@/components/ledger-manager'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Suspense } from 'react'
import { LiveActionsProvider } from '@/lib/actions-context'
import { DemoDashboard } from '@/app/dashboard/demo-dashboard'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; ledger?: string }>
}) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return (
      <Suspense>
        <DemoDashboard />
      </Suspense>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { year: yearParam, month: monthParam, ledger: ledgerParam } = await searchParams
  const now = new Date()
  const year = yearParam ? parseInt(yearParam) : now.getFullYear()
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1

  // Ensure the shared public ledger exists using the authenticated supabase client
  const { count: publicCount } = await supabase
    .from('ledgers')
    .select('id', { count: 'exact', head: true })
    .eq('is_public', true)

  if (!publicCount) {
    await supabase
      .from('ledgers')
      .insert({ name: '作伙帳本', owner_id: user.id, is_public: true })
  }

  const [ledgers, profile, categories] = await Promise.all([
    getLedgers(),
    getProfile(),
    getCategories(),
  ])

  // Resolve current ledger: URL param → accessible ledger, else public ledger
  const publicLedger = ledgers.find((l) => l.is_public)
  const currentLedger = ledgerParam
    ? (ledgers.find((l) => l.id === ledgerParam) ?? publicLedger)
    : publicLedger

  const transactions = await getTransactions(year, month, currentLedger?.id)

  const monthlyTotal = transactions.reduce(
    (sum, tx) => sum + tx.amount * (tx.exchange_rate ?? 1),
    0
  )
  const nickname = profile?.nickname ?? user.email ?? ''
  const isAdmin = profile?.is_admin ?? false

  return (
    <LiveActionsProvider>
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
            ledgers={ledgers}
            currentLedgerId={currentLedger?.id ?? ''}
            currentUserId={user.id}
          />
          <CategoryManager initialCategories={categories} />
          <ProfileDialog email={user.email ?? ''} nickname={nickname} />
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">登出</Button>
          </form>
        </div>
      </header>

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
        categories={categories}
        currentUserId={user.id}
        userNickname={nickname}
        ledgerId={currentLedger?.id}
        defaultCurrency={currentLedger?.default_currency}
        isAdmin={isAdmin}
      />
    </div>
    </LiveActionsProvider>
  )
}
