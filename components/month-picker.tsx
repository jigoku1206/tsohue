'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

export function MonthPicker({
  year,
  month,
  ledgerId,
}: {
  year: number
  month: number
  ledgerId?: string
}) {
  const router = useRouter()

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  function navigate(deltaMonths: number) {
    const d = new Date(year, month - 1 + deltaMonths, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const ledgerQuery = ledgerId ? `&ledger=${ledgerId}` : ''
    router.push(`/dashboard?year=${y}&month=${m}${ledgerQuery}`)
  }

  const label = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, 1))

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
        <ChevronLeftIcon className="size-4" />
      </Button>
      <span className="text-sm font-medium w-24 text-center">{label}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(1)}
        disabled={isCurrentMonth}
        className="h-8 w-8 p-0"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  )
}
