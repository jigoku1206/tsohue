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
        <header className="shrink-0 flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
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
              <Button variant="ghost" size="sm" type="submit">登出</Button>
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
