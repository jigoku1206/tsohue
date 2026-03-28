'use client'

import { useState } from 'react'
import { CalendarDays, BarChart2 } from 'lucide-react'
import { CalendarView } from '@/components/calendar-view'
import { ReportView } from '@/components/report-view'
import type { Transaction } from '@/app/actions/transactions'
import type { Category } from '@/app/actions/categories'

type Tab = 'calendar' | 'report'

export function DashboardTabs({
  year,
  month,
  transactions,
  categories,
  currentUserId,
  userNickname,
  ledgerId,
  defaultCurrency,
  isAdmin,
}: {
  year: number
  month: number
  transactions: Transaction[]
  categories: Category[]
  currentUserId: string
  userNickname: string
  ledgerId?: string
  defaultCurrency?: string
  isAdmin?: boolean
}) {
  const [tab, setTab] = useState<Tab>('calendar')

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* Tab bar */}
      <div className="shrink-0 flex rounded-lg border p-1 bg-muted gap-1">
        {([
          { key: 'calendar', label: '日曆', Icon: CalendarDays },
          { key: 'report',   label: '報表', Icon: BarChart2 },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 rounded-md transition-colors font-medium',
              tab === key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {tab === 'calendar' ? (
          <CalendarView
            year={year}
            month={month}
            transactions={transactions}
            categories={categories}
            currentUserId={currentUserId}
            userNickname={userNickname}
            ledgerId={ledgerId}
            defaultCurrency={defaultCurrency}
            isAdmin={isAdmin}
          />
        ) : (
          <ReportView
            year={year}
            month={month}
            transactions={transactions}
            categories={categories}
            ledgerId={ledgerId}
          />
        )}
      </div>
    </div>
  )
}
