'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import type { Transaction } from '@/app/actions/transactions'
import type { Category } from '@/app/actions/categories'
import { TransactionList } from '@/components/transaction-list'
import { AddTransactionDialog } from '@/components/add-transaction-dialog'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatNTD(amount: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function CalendarView({
  year,
  month,
  transactions,
  categories,
  currentUserId,
  userNickname,
  ledgerId,
  defaultCurrency,
  isAdmin,
  calendarOpen,
  onToggleCalendar,
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
  calendarOpen: boolean
  onToggleCalendar: Dispatch<SetStateAction<boolean>>
}) {
  const today = new Date()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1
  const [selectedDay, setSelectedDay] = useState(isCurrentMonth ? today.getDate() : 1)

  const listRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef(0)

  // Reset list scroll to top whenever the selected day changes
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
      lastScrollTop.current = 0
    }
  }, [selectedDay])

  // Collapse calendar when scrolling down in the list.
  // Expand logic is intentionally NOT on the scrollable list to avoid
  // interfering with touch scroll gestures (causes iOS to redirect
  // scroll events to the body).
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const st = e.currentTarget.scrollTop
    if (st > lastScrollTop.current && st > 10) {
      onToggleCalendar(false)
    }
    lastScrollTop.current = st
  }, [onToggleCalendar])

  // Expand via a dedicated non-scrollable drag handle shown when collapsed.
  const dragStartY = useRef(0)
  const handleDragTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
  }, [])
  const handleDragTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches[0].clientY - dragStartY.current > 20) {
      onToggleCalendar(true)
    }
  }, [onToggleCalendar])
  const handleDragWheel = useCallback((e: React.WheelEvent) => {
    if (e.deltaY < 0) onToggleCalendar(true)
  }, [onToggleCalendar])

  // Group transactions by day number
  const byDay = useMemo(() => {
    const map = new Map<number, Transaction[]>()
    for (const tx of transactions) {
      const day = parseInt(tx.date.split('-')[2])
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(tx)
    }
    return map
  }, [transactions])

  const selectedTransactions = byDay.get(selectedDay) ?? []
  const selectedTotal = selectedTransactions.reduce(
    (sum, tx) => sum + tx.amount * (tx.exchange_rate ?? 1),
    0
  )

  // Build calendar grid cells (null = empty padding cell)
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const selectedLabel = `${year}年${month}月${selectedDay}日`

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* ── Calendar grid (collapsible) ── */}
      <div
        className="shrink-0 rounded-xl border bg-card overflow-hidden transition-all duration-300"
        style={{ maxHeight: calendarOpen ? '500px' : '0px', opacity: calendarOpen ? 1 : 0 }}
      >
        <div className="p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`pad-${i}`} />

              const isToday = isCurrentMonth && day === today.getDate()
              const isSelected = day === selectedDay
              const dayTxs = byDay.get(day) ?? []
              const dayTotal = dayTxs.reduce((s, tx) => s + tx.amount * (tx.exchange_rate ?? 1), 0)

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={[
                    'flex flex-col items-center justify-start py-1.5 rounded-lg text-sm transition-colors min-h-[3rem]',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                      ? 'ring-1 ring-primary font-semibold hover:bg-muted/50'
                      : 'hover:bg-muted/50',
                  ].join(' ')}
                >
                  <span className="text-sm leading-none">{day}</span>
                  {dayTxs.length > 0 && (
                    <span
                      className={[
                        'text-[10px] leading-tight mt-0.5',
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                      ].join(' ')}
                    >
                      {formatNTD(dayTotal).replace('NT$', '').replace('$', '')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Drag handle: expand calendar when collapsed ── */}
      {!calendarOpen && (
        <button
          className="shrink-0 -mt-2 flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => onToggleCalendar(true)}
          onTouchStart={handleDragTouchStart}
          onTouchMove={handleDragTouchMove}
          onWheel={handleDragWheel}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      )}

      {/* ── Selected day header ── */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
            disabled={selectedDay === 1}
            className="p-1 rounded-md hover:bg-muted/50 transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold">{selectedLabel}</h2>
            {selectedTransactions.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {selectedTransactions.length} 筆・{formatNTD(selectedTotal)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">無消費記錄</p>
            )}
          </div>
          <button
            onClick={() => setSelectedDay((d) => Math.min(daysInMonth, d + 1))}
            disabled={selectedDay === daysInMonth}
            className="p-1 rounded-md hover:bg-muted/50 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <AddTransactionDialog
          userNickname={userNickname}
          categories={categories}
          defaultDate={`${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`}
          ledgerId={ledgerId}
          defaultCurrency={defaultCurrency}
        />
      </div>

      {/* ── Transaction list (scrollable) ── */}
      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-scroll overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={handleScroll}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <TransactionList
          transactions={selectedTransactions}
          categories={categories}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}
