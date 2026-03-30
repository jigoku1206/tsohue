'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useActions } from '@/lib/actions-context'
import type { LedgerBudget } from '@/app/actions/budgets'
import type { Category } from '@/app/actions/categories'
import { toast } from 'sonner'

type Props = {
  ledgerId: string
  budgets: LedgerBudget[]
  categories: Category[]
  onSaved: () => void
}

function budgetsToMap(budgets: LedgerBudget[]): Record<string, string> {
  const m: Record<string, string> = {}
  for (const b of budgets) m[b.category ?? ''] = String(b.monthly_limit)
  return m
}

export function BudgetSettingsDialog({ ledgerId, budgets, categories, onSaved }: Props) {
  const { upsertLedgerBudget } = useActions()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [limits, setLimits] = useState<Record<string, string>>({})

  const topLevelCats = categories.filter((c) => c.parent_id === null)

  function handleOpenChange(v: boolean) {
    if (v) setLimits(budgetsToMap(budgets))
    setOpen(v)
  }

  function setLimit(key: string, val: string) {
    setLimits((prev) => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const entries: [string | null, number | null][] = [
        [null, parseFloat(limits[''] || '0') || null],
        ...topLevelCats.map((c): [string | null, number | null] => [
          c.name,
          parseFloat(limits[c.name] || '0') || null,
        ]),
      ]
      for (const [cat, val] of entries) {
        const res = await upsertLedgerBudget(ledgerId, cat, val)
        if (res.error) { toast.error(res.error); return }
      }
      onSaved()
      setOpen(false)
      toast.success('預算設定已儲存')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => handleOpenChange(true)}
        aria-label="設定預算"
      >
        <Settings className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>每月預算設定</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">每月總預算</Label>
              <Input
                type="number"
                min={0}
                placeholder="不設定請留空"
                value={limits[''] ?? ''}
                onChange={(e) => setLimit('', e.target.value)}
              />
            </div>

            {topLevelCats.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground -mb-2">各類別上限（不設定請留空）</p>
                {topLevelCats.map((cat) => (
                  <div key={cat.id} className="flex flex-col gap-1.5">
                    <Label className="text-sm">{cat.name}</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="不設定"
                      value={limits[cat.name] ?? ''}
                      onChange={(e) => setLimit(cat.name, e.target.value)}
                    />
                  </div>
                ))}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '儲存中…' : '儲存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
