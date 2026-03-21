'use client'

import { useState } from 'react'
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
import { updateTransaction, type Transaction } from '@/app/actions/transactions'
import type { Category } from '@/app/actions/categories'
import { toast } from 'sonner'

export function EditTransactionDialog({
  transaction,
  categories,
  open,
  onOpenChange,
}: {
  transaction: Transaction
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [categoryName, setCategoryName] = useState(transaction.category)
  const [subcategoryName, setSubcategoryName] = useState(transaction.subcategory ?? '')

  const selectedCategory = categories.find((c) => c.name === categoryName)
  const subcategories = selectedCategory?.subcategories ?? []

  function handleCategoryChange(v: string | null) {
    setCategoryName(v ?? '')
    setSubcategoryName('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('category', categoryName)
    formData.set('subcategory', subcategoryName)

    const result = await updateTransaction(transaction.id, formData)
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>編輯消費記錄</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date">日期</Label>
            <Input id="date" name="date" type="date" defaultValue={transaction.date} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">金額（NT$）</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={transaction.amount}
            />
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
            <Button type="submit" disabled={loading || !categoryName} className="flex-1">
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
