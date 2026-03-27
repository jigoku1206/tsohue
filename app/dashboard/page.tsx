import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/app/actions/profile'
import { getLedgers } from '@/app/actions/ledgers'
import { getCategories } from '@/app/actions/categories'
import { getRegistrationEnabled } from '@/app/actions/settings'
import { CategoryManager } from '@/components/category-manager'
import { ProfileDialog } from '@/components/profile-dialog'
import { LedgerManager } from '@/components/ledger-manager'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import Link from 'next/link'
import { LiveActionsProvider } from '@/lib/actions-context'
import { DemoWrapper } from '@/app/dashboard/demo-wrapper'
import { TransactionSection } from '@/app/dashboard/transaction-section'

function DashboardSkeleton({ year, month }: { year: number; month: number }) {
  const monthLabel = `${year}年 ${month}月`
  return (
    <div className="flex flex-col gap-3">
      {/* Month picker card skeleton */}
      <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-muted animate-pulse" />
          <span className="text-sm font-medium">{monthLabel}</span>
          <div className="w-6 h-6 rounded bg-muted animate-pulse" />
          <div className="w-10 h-5 rounded bg-muted animate-pulse" />
        </div>
        <div className="text-right">
          <div className="w-16 h-3 rounded bg-muted animate-pulse mb-1 ml-auto" />
          <div className="w-24 h-6 rounded bg-muted animate-pulse" />
        </div>
      </div>

      {/* Tab bar + content skeleton */}
      <div className="flex flex-col gap-4">
        <div className="flex rounded-lg border p-1 bg-muted gap-1">
          <div className="flex-1 h-8 rounded-md bg-background animate-pulse" />
          <div className="flex-1 h-8 rounded-md animate-pulse" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; ledger?: string }>
}) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <DemoWrapper />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { year: yearParam, month: monthParam, ledger: ledgerParam } = await searchParams
  const now = new Date()
  const year = yearParam ? parseInt(yearParam) : now.getFullYear()
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1

  // Fetch ledgers, profile, categories, and settings in parallel
  const [ledgers, profile, categories, registrationEnabled] = await Promise.all([
    getLedgers(),
    getProfile(),
    getCategories(),
    getRegistrationEnabled(),
  ])

  const publicLedger = ledgers.find((l) => l.is_public)
  const currentLedger = ledgerParam
    ? (ledgers.find((l) => l.id === ledgerParam) ?? publicLedger)
    : publicLedger

  const nickname = profile?.nickname ?? user.email ?? ''
  const isAdmin = profile?.is_admin ?? false

  return (
    <LiveActionsProvider>
      <div className="max-w-2xl mx-auto w-full p-4 flex flex-col gap-3">
        {/* Header renders immediately */}
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
              ledgers={ledgers}
              currentLedgerId={currentLedger?.id ?? ''}
              currentUserId={user.id}
            />
            <CategoryManager initialCategories={categories} />
            <ProfileDialog
              email={user.email ?? ''}
              nickname={nickname}
              isAdmin={isAdmin}
              registrationEnabled={registrationEnabled}
            />
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit">登出</Button>
            </form>
          </div>
        </header>

        {/* Transactions stream in behind skeleton */}
        <Suspense fallback={<DashboardSkeleton year={year} month={month} />}>
          <TransactionSection
            year={year}
            month={month}
            ledgerId={currentLedger?.id}
            defaultCurrency={currentLedger?.default_currency}
            currentUserId={user.id}
            userNickname={nickname}
            isAdmin={isAdmin}
            categories={categories}
          />
        </Suspense>
      </div>
    </LiveActionsProvider>
  )
}
