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
import { addTransaction } from '@/app/actions/transactions'
import type { Category } from '@/app/actions/categories'
import { toast } from 'sonner'

export function AddTransactionDialog({
  userEmail,
  categories,
}: {
  userEmail: string
  categories: Category[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [subcategoryName, setSubcategoryName] = useState('')

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

    const result = await addTransaction(formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('記帳成功')
      setOpen(false)
      setCategoryName('')
      setSubcategoryName('')
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ 新增記錄</Button>

      <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增消費記錄</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">日期</Label>
              <Input id="date" name="date" type="date" defaultValue={today} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">金額（NT$）</Label>
              <Input id="amount" name="amount" type="number" min="0" step="1" required placeholder="0" />
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
              <Input id="paid_by" name="paid_by" defaultValue={userEmail} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note">備註</Label>
              <Input id="note" name="note" placeholder="（選填）" />
            </div>
            <Button type="submit" disabled={loading || !categoryName}>
              {loading ? '儲存中…' : '儲存'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
