'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getCategories, type Category } from '@/app/actions/categories'
import { logout } from '@/app/actions/auth'
import { CategoryManager } from '@/components/category-manager'
import { LedgerManager } from '@/components/ledger-manager'
import { ProfileDialog } from '@/components/profile-dialog'
import { MonthController } from '@/components/month-controller'
import { Button } from '@/components/ui/button'
import type { Ledger } from '@/app/actions/ledgers'
import { LogOut } from 'lucide-react'

export function DashboardShell({
  initialYear,
  initialMonth,
  initialLedgerId,
  ledgers,
  currentUserId,
  userEmail,
  userNickname,
  isAdmin,
  registrationEnabled,
}: {
  initialYear: number
  initialMonth: number
  initialLedgerId?: string
  ledgers: Ledger[]
  currentUserId: string
  userEmail: string
  userNickname: string
  isAdmin: boolean
  registrationEnabled: boolean
}) {
  const publicLedger = useMemo(() => ledgers.find((l) => l.is_public), [ledgers])
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [currentLedgerId, setCurrentLedgerId] = useState(initialLedgerId ?? publicLedger?.id ?? '')
  const [categoriesState, setCategoriesState] = useState<{
    loaded: boolean
    categories: Category[]
  }>({ loaded: false, categories: [] })

  const currentLedger = useMemo(
    () => ledgers.find((l) => l.id === currentLedgerId) ?? publicLedger,
    [currentLedgerId, ledgers, publicLedger]
  )

  useEffect(() => {
    let cancelled = false
    getCategories().then((categories) => {
      if (!cancelled) setCategoriesState({ loaded: true, categories })
    })
    return () => {
      cancelled = true
    }
  }, [])

  function updateUrl(nextYear: number, nextMonth: number, nextLedgerId?: string) {
    const ledgerQuery = nextLedgerId ? `&ledger=${nextLedgerId}` : ''
    window.history.replaceState(null, '', `/dashboard?year=${nextYear}&month=${nextMonth}${ledgerQuery}`)
  }

  function handleDateChange(nextYear: number, nextMonth: number) {
    setYear(nextYear)
    setMonth(nextMonth)
    updateUrl(nextYear, nextMonth, currentLedger?.id)
  }

  function handleLedgerChange(id: string) {
    setCurrentLedgerId(id)
    updateUrl(year, month, id)
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="max-w-2xl mx-auto h-full flex flex-col">
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
              ledgers={ledgers}
              currentLedgerId={currentLedger?.id ?? ''}
              currentUserId={currentUserId}
              onSwitchLedger={handleLedgerChange}
            />
            <CategoryManager
              key={categoriesState.loaded ? 'loaded' : 'loading'}
              initialCategories={categoriesState.categories}
              isLoading={!categoriesState.loaded}
            />
            <ProfileDialog
              email={userEmail}
              nickname={userNickname}
              isAdmin={isAdmin}
              registrationEnabled={registrationEnabled}
            />
            <form action={logout}>
              <Button variant="ghost" size="icon" type="submit" aria-label="登出" title="登出" className="h-9 w-9 sm:h-8 sm:w-auto sm:px-3">
                <LogOut className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">登出</span>
              </Button>
            </form>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <MonthController
            year={year}
            month={month}
            categories={categoriesState.categories}
            currentUserId={currentUserId}
            userNickname={userNickname}
            ledgerId={currentLedger?.id}
            defaultCurrency={currentLedger?.default_currency}
            isAdmin={isAdmin}
            onDateChange={handleDateChange}
          />
        </div>
      </div>
    </div>
  )
}
