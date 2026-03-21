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
import { addTransaction } from '@/app/actions/transactions'
import { fetchExchangeRates } from '@/app/actions/exchange-rates'
import { CURRENCIES, type CurrencyCode, type ExchangeRates } from '@/lib/currencies'
import type { Category } from '@/app/actions/categories'
import { toast } from 'sonner'

const today = () => new Date().toISOString().split('T')[0]

export function AddTransactionDialog({
  userNickname,
  categories,
  defaultDate,
  ledgerId,
  defaultCurrency,
}: {
  userNickname: string
  categories: Category[]
  defaultDate?: string
  ledgerId?: string
  defaultCurrency?: string
}) {
  const resolveCurrency = (c?: string): CurrencyCode =>
    (CURRENCIES.find((x) => x.code === c)?.code ?? 'TWD') as CurrencyCode

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [subcategoryName, setSubcategoryName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(resolveCurrency(defaultCurrency))

  // Sync currency when ledger changes (only while dialog is closed)
  useEffect(() => {
    if (!open) setCurrency(resolveCurrency(defaultCurrency))
  }, [defaultCurrency, open])
  const [selectedDate, setSelectedDate] = useState(defaultDate ?? today())
  const [rates, setRates] = useState<ExchangeRates>({})
  const [loadingRates, setLoadingRates] = useState(false)

  const selectedCategory = categories.find((c) => c.name === categoryName)
  const subcategories = selectedCategory?.subcategories ?? []
  const isFuture = selectedDate > today()
  const currentRate = currency === 'TWD' ? 1 : (rates[currency] ?? null)
  const currencyMeta = CURRENCIES.find((c) => c.code === currency)!

  // Reset date when defaultDate changes (user picks a different calendar day)
  useEffect(() => {
    setSelectedDate(defaultDate ?? today())
  }, [defaultDate])

  // Fetch rates when dialog opens, date changes, or non-TWD currency selected
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

  function handleClose() {
    setOpen(false)
    setCategoryName('')
    setSubcategoryName('')
    // currency will be reset by the useEffect above when open becomes false
    setRates({})
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

    const result = await addTransaction(formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('記帳成功')
      handleClose()
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ 新增記錄</Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增消費記錄</DialogTitle>
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

            {/* Amount + Currency */}
            <div className="flex flex-col gap-1.5">
              <Label>金額與幣別</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step={currencyMeta.decimals === 0 ? '1' : '0.01'}
                  required
                  placeholder="0"
                  className="flex-1"
                />
                <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
                  <SelectTrigger className="w-28 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rate hint */}
              {currency !== 'TWD' && (
                <p className={`text-xs ${isFuture ? 'text-destructive' : 'text-muted-foreground'}`}>
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
              <Input id="paid_by" name="paid_by" defaultValue={userNickname} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note">備註</Label>
              <Input id="note" name="note" placeholder="（選填）" />
            </div>
            <Button
              type="submit"
              disabled={loading || !categoryName || (currency !== 'TWD' && (loadingRates || !currentRate))}
            >
              {loading ? '儲存中…' : '儲存'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
