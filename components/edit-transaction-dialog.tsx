'use client'

import { useState, useEffect } from 'react'
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
import type { Transaction } from '@/app/actions/transactions'
import { useActions } from '@/lib/actions-context'
import { CURRENCIES, type CurrencyCode, type ExchangeRates } from '@/lib/currencies'
import type { Category } from '@/app/actions/categories'
import { AmountCalculator } from '@/components/amount-calculator'
import { toast } from 'sonner'

const todayStr = () => new Date().toISOString().split('T')[0]

export function EditTransactionDialog({
  transaction,
  categories,
  open,
  onOpenChange,
  recurringRuleId,
  recurringFromDate,
  recurringScope,
}: {
  transaction: Transaction
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
  recurringRuleId?: string
  recurringFromDate?: string
  recurringScope?: 'all' | 'from_date'
}) {
  const { updateTransaction, updateRecurringByScope, fetchExchangeRates } = useActions()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState(String(transaction.amount))
  const [categoryName, setCategoryName] = useState(transaction.category)
  const [subcategoryName, setSubcategoryName] = useState(transaction.subcategory ?? '')
  const [currency, setCurrency] = useState<CurrencyCode>(
    (transaction.currency as CurrencyCode) ?? 'TWD'
  )
  const [selectedDate, setSelectedDate] = useState(transaction.date)
  const [rates, setRates] = useState<ExchangeRates>({})
  const [loadingRates, setLoadingRates] = useState(false)

  const selectedCategory = categories.find((c) => c.name === categoryName)
  const subcategories = selectedCategory?.subcategories ?? []
  const isFuture = selectedDate > todayStr()
  // Use fetched rate, fallback to stored rate if API fails
  const currentRate = currency === 'TWD'
    ? 1
    : (rates[currency] ?? (isFuture ? null : transaction.exchange_rate) ?? null)
  const currencyMeta = CURRENCIES.find((c) => c.code === currency)!

  useEffect(() => {
    if (!open || currency === 'TWD') {
      setRates({})
      return
    }
    setLoadingRates(true)
    fetchExchangeRates(selectedDate).then((r) => {
      setRates(r)
      setLoadingRates(false)
    })
  }, [open, selectedDate, currency])

  function handleCategoryChange(v: string | null) {
    setCategoryName(v ?? '')
    setSubcategoryName('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (currency !== 'TWD' && !currentRate) {
      toast.error('匯率載入中，請稍後再試')
      return
    }
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('amount', amount)
    formData.set('category', categoryName)
    formData.set('subcategory', subcategoryName)
    formData.set('currency', currency)
    formData.set('exchange_rate', String(currentRate ?? 1))

    let result: { error?: string | null }
    if (recurringRuleId && recurringFromDate && recurringScope) {
      result = await updateRecurringByScope(recurringRuleId, recurringFromDate, recurringScope, formData)
    } else {
      result = await updateTransaction(transaction.id, formData)
    }
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('已更新')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            編輯消費記錄
            {recurringScope && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                （{recurringScope === 'all' ? '全部週期' : '此筆及之後'}）
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">日期</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />
          </div>

          {/* Calculator */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>金額</Label>
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
              initialValue={String(transaction.amount)}
              onChange={setAmount}
            />
            {currency !== 'TWD' && (
              <p className={`text-xs ${isFuture ? 'text-destructive' : 'text-muted-foreground'}`}>
                {loadingRates
                  ? '匯率載入中…'
                  : currentRate
                  ? isFuture
                    ? `⚠ 選擇的是未來日期，匯率僅供參考（今日）：${currencyMeta.label} ${currency}（1:${currentRate.toFixed(4)}）`
                    : `${currencyMeta.label} ${currency}（1:${currentRate.toFixed(4)}）${selectedDate === todayStr() ? '今日' : selectedDate}參考匯率`
                  : '無法獲取匯率，請稍後再試'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>類別</Label>
              <Select value={categoryName} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇類別" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>子類別</Label>
              <Select
                value={subcategoryName}
                onValueChange={(v) => setSubcategoryName(v ?? '')}
                disabled={subcategories.length === 0}
              >
                <SelectTrigger>
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paid_by">付款人</Label>
            <Input id="paid_by" name="paid_by" defaultValue={transaction.paid_by} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">備註</Label>
            <Input id="note" name="note" defaultValue={transaction.note ?? ''} placeholder="（選填）" />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading || !categoryName || !amount || amount === '0' || (currency !== 'TWD' && (loadingRates || !currentRate))}
              className="flex-1"
            >
              {loading ? '儲存中…' : '儲存'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
