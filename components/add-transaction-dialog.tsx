'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useActions } from '@/lib/actions-context'
import { CURRENCIES, type CurrencyCode, type ExchangeRates } from '@/lib/currencies'
import type { Category } from '@/app/actions/categories'
import { AmountCalculator } from '@/components/amount-calculator'
import { toast } from 'sonner'

const today = () => new Date().toISOString().split('T')[0]

export function AddTransactionDialog({
  userNickname,
  categories,
  defaultDate,
  ledgerId,
  defaultCurrency,
  ledgerMembers,
}: {
  userNickname: string
  categories: Category[]
  defaultDate?: string
  ledgerId?: string
  defaultCurrency?: string
  ledgerMembers?: { id: string; nickname: string }[]
}) {
  const { addTransaction, createRecurringRule, fetchExchangeRates } = useActions()

  const resolveCurrency = useCallback((c?: string): CurrencyCode =>
    (CURRENCIES.find((x) => x.code === c)?.code ?? 'TWD') as CurrencyCode, [])

  // When ledger has members (shared ledger), use a controlled paidBy state
  const showMemberSelect = !!(ledgerId && ledgerMembers && ledgerMembers.length > 1)
  const [paidBy, setPaidBy] = useState(userNickname)

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('0')
  const [categoryName, setCategoryName] = useState('')
  const [subcategoryName, setSubcategoryName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(resolveCurrency(defaultCurrency))
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState<'monthly' | 'weekly'>('monthly')
  const [recurringCount, setRecurringCount] = useState('3')

  const [selectedDate, setSelectedDate] = useState(defaultDate ?? today())
  const [rateState, setRateState] = useState<{ key: string; rates: ExchangeRates } | null>(null)

  const selectedCategory = categories.find((c) => c.name === categoryName)
  const subcategories = selectedCategory?.subcategories ?? []
  const isFuture = selectedDate > today()
  const rateKey = `${selectedDate}:${currency}`
  const rates = rateState?.key === rateKey ? rateState.rates : {}
  const currentRate = currency === 'TWD' ? 1 : (rates[currency] ?? null)
  const loadingRates = currency !== 'TWD' && rateState?.key !== rateKey
  const currencyMeta = CURRENCIES.find((c) => c.code === currency)!

  // Fetch rates when dialog opens, date changes, or non-TWD currency selected
  useEffect(() => {
    if (!open || currency === 'TWD') {
      return
    }
    let cancelled = false
    fetchExchangeRates(selectedDate).then((r) => {
      if (cancelled) return
      setRateState({ key: rateKey, rates: r })
    })
    return () => {
      cancelled = true
    }
  }, [currency, fetchExchangeRates, open, rateKey, selectedDate])

  function handleCategoryChange(v: string | null) {
    setCategoryName(v ?? '')
    setSubcategoryName('')
  }

  function handleClose() {
    setOpen(false)
    setAmount('0')
    setCategoryName('')
    setSubcategoryName('')
    setPaidBy(userNickname)
    setIsRecurring(false)
    setRecurringFrequency('monthly')
    setRecurringCount('3')
    // currency is reset when the dialog opens for a new entry
    setRateState(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (currency !== 'TWD' && !currentRate) {
      toast.error('匯率載入中，請稍後再試')
      return
    }
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('category', categoryName)
    formData.set('subcategory', subcategoryName)
    formData.set('currency', currency)
    formData.set('exchange_rate', String(currentRate ?? 1))
    if (ledgerId) formData.set('ledger_id', ledgerId)
    formData.set('amount', amount)
    if (showMemberSelect) formData.set('paid_by', paidBy)

    if (isRecurring) {
      formData.set('recurring_frequency', recurringFrequency)
      formData.set('recurring_count', recurringCount)
      const result = await createRecurringRule(formData)
      setLoading(false)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('週期記帳已建立')
        handleClose()
      }
    } else {
      const result = await addTransaction(formData)
      setLoading(false)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('記帳成功')
        handleClose()
      }
    }
  }

  return (
    <>
      <Button onClick={() => {
        setSelectedDate(defaultDate ?? today())
        setCurrency(resolveCurrency(defaultCurrency))
        setOpen(true)
      }}>+ 新增記錄</Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
        <DialogContent className="flex max-h-[calc(100dvh-0.75rem)] max-w-[calc(100%-0.75rem)] flex-col gap-2 overflow-hidden p-3 sm:max-w-md sm:gap-4 sm:p-4">
          <DialogHeader className="shrink-0 gap-1 pr-8">
            <DialogTitle>新增消費記錄</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3">
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <div className="flex min-w-0 flex-col gap-1">
                <Label htmlFor="date" className="text-xs sm:text-sm">{isRecurring ? '首期日期' : '日期'}</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="h-9 min-w-0 text-sm"
                />
              </div>
              <label className="flex h-9 items-center gap-2 whitespace-nowrap rounded-md border px-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-foreground"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                <span className="text-sm font-medium leading-none">週期消費</span>
              </label>
            </div>

            {/* Recurring options */}
            <div className={isRecurring ? 'grid grid-cols-2 gap-2' : 'hidden'}>
              {isRecurring && (
                <>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs sm:text-sm">週期</Label>
                    <Select value={recurringFrequency} onValueChange={(v) => { if (v) setRecurringFrequency(v as 'monthly' | 'weekly') }}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">每月</SelectItem>
                        <SelectItem value="weekly">每週</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs sm:text-sm">期數</Label>
                    <Select value={recurringCount} onValueChange={(v) => { if (v) setRecurringCount(v) }}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 期</SelectItem>
                        <SelectItem value="6">6 期</SelectItem>
                        <SelectItem value="12">12 期</SelectItem>
                        <SelectItem value="indefinite">無限期</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Calculator */}
            <div className="flex min-h-0 flex-col gap-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm">金額</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                  <SelectTrigger className="w-28 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <AmountCalculator
                key={open ? 'open' : 'closed'}
                initialValue="0"
                onChange={setAmount}
                compact
              />
              {currency !== 'TWD' && (
                <p className={`truncate text-[11px] ${isFuture ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {loadingRates
                    ? '匯率載入中…'
                    : currentRate
                    ? isFuture
                      ? `⚠ 選擇的是未來日期，匯率僅供參考（今日）：${currencyMeta.label} ${currency}（1:${currentRate.toFixed(4)}）`
                      : `${currencyMeta.label} ${currency}（1:${currentRate.toFixed(4)}）${selectedDate === today() ? '今日' : selectedDate}參考匯率`
                    : '無法獲取匯率，請稍後再試'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex min-w-0 flex-col gap-1">
                <Label className="text-xs sm:text-sm">類別</Label>
                <Select value={categoryName} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-9 min-w-0">
                    <SelectValue placeholder="選擇類別" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <Label className="text-xs sm:text-sm">子類別</Label>
                <Select
                  value={subcategoryName}
                  onValueChange={(v) => setSubcategoryName(v ?? '')}
                  disabled={subcategories.length === 0}
                >
                  <SelectTrigger className="h-9 min-w-0">
                    <SelectValue placeholder={subcategories.length === 0 ? '—' : '選擇子類別'} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((s) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex min-w-0 flex-col gap-1">
                <Label htmlFor="paid_by" className="text-xs sm:text-sm">付款人</Label>
                {showMemberSelect ? (
                  <Select value={paidBy} onValueChange={(v) => { if (v) setPaidBy(v) }}>
                    <SelectTrigger id="paid_by" className="h-9 min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ledgerMembers!.map((m) => (
                        <SelectItem key={m.id} value={m.nickname}>{m.nickname}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input id="paid_by" name="paid_by" defaultValue={userNickname} required className="h-9 min-w-0" />
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <Label htmlFor="note" className="text-xs sm:text-sm">備註</Label>
                <Input id="note" name="note" placeholder="（選填）" className="h-9 min-w-0" />
              </div>
            </div>
            <div className="min-h-4">
              {!loading && (() => {
                if (!categoryName) return <p className="truncate text-xs text-destructive">請先選擇類別</p>
                if (!amount || amount === '0') return <p className="truncate text-xs text-destructive">請輸入金額</p>
                if (currency !== 'TWD' && loadingRates) return <p className="truncate text-xs text-muted-foreground">匯率載入中，請稍候…</p>
                return null
              })()}
            </div>
            <Button
              type="submit"
              className="h-9 shrink-0"
              disabled={loading || !categoryName || !amount || amount === '0' || (currency !== 'TWD' && (loadingRates || !currentRate))}
            >
              {loading ? '儲存中…' : '儲存'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
