'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

export function MonthPicker({
  year,
  month,
  ledgerId,
  isPending,
  onNavigate,
  onNavigateToToday,
}: {
  year: number
  month: number
  ledgerId?: string
  isPending?: boolean
  onNavigate?: (deltaMonths: number) => void
  onNavigateToToday?: () => void
}) {
  const router = useRouter()

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  function navigate(deltaMonths: number) {
    if (onNavigate) {
      onNavigate(deltaMonths)
      return
    }
    const d = new Date(year, month - 1 + deltaMonths, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const ledgerQuery = ledgerId ? `&ledger=${ledgerId}` : ''
    router.push(`/dashboard?year=${y}&month=${m}${ledgerQuery}`)
  }

  function handleLabelClick() {
    if (isCurrentMonth) return
    if (onNavigateToToday) {
      onNavigateToToday()
      return
    }
    const ledgerQuery = ledgerId ? `&ledger=${ledgerId}` : ''
    router.push(`/dashboard?year=${now.getFullYear()}&month=${now.getMonth() + 1}${ledgerQuery}`)
  }

  const label = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, 1))

  return (
    <div className={`flex items-center gap-2 transition-opacity${isPending ? ' opacity-50' : ''}`}>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0" disabled={isPending}>
        <ChevronLeftIcon className="size-4" />
      </Button>
      <div className="flex flex-col items-center gap-0.5">
        <button
          onClick={handleLabelClick}
          disabled={isPending}
          className={`text-sm font-medium w-24 text-center leading-none ${!isCurrentMonth && !isPending ? 'cursor-pointer hover:text-primary' : 'cursor-default'}`}
        >
          {label}
        </button>
        {!isCurrentMonth && !isPending && (
          <button
            onClick={handleLabelClick}
            className="text-[10px] text-primary hover:underline leading-none"
          >
            回到今日
          </button>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(1)}
        className="h-8 w-8 p-0"
        disabled={isPending}
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  )
}
