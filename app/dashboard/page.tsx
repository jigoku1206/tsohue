import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/app/actions/profile'
import { getLedgers } from '@/app/actions/ledgers'
import { getRegistrationEnabled } from '@/app/actions/settings'
import { LiveActionsProvider } from '@/lib/actions-context'
import { DemoWrapper } from '@/app/dashboard/demo-wrapper'
import { DashboardShell } from '@/app/dashboard/dashboard-shell'

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

  // Keep only shell-critical data on the server path. Transactions, categories,
  // budgets, and members load in the client after the dashboard frame renders.
  const [ledgers, profile, registrationEnabled] = await Promise.all([
    getLedgers(),
    getProfile(),
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
      <DashboardShell
        initialYear={year}
        initialMonth={month}
        initialLedgerId={currentLedger?.id}
        ledgers={ledgers}
        currentUserId={user.id}
        userEmail={user.email ?? ''}
        userNickname={nickname}
        isAdmin={isAdmin}
        registrationEnabled={registrationEnabled}
      />
    </LiveActionsProvider>
  )
}
