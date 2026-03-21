'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from '@/app/actions/categories'
import { toast } from 'sonner'

// ─── Inline editable row ────────────────────────────────────────────────────

function CategoryRow({
  id,
  name,
  indent = false,
  onDelete,
}: {
  id: string
  name: string
  indent?: boolean
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [isPending, startTransition] = useTransition()

  function handleRename() {
    if (value.trim() === name) { setEditing(false); return }
    startTransition(async () => {
      const result = await updateCategory(id, value.trim())
      if (result.error) { toast.error(result.error); setValue(name) }
      else toast.success('已更新')
      setEditing(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCategory(id)
      if (result.error) toast.error(result.error)
      else { toast.success('已刪除'); onDelete() }
    })
  }

  return (
    <div className={`flex items-center gap-2 ${indent ? 'pl-6' : ''}`}>
      {editing ? (
        <>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') { setValue(name); setEditing(false) }
            }}
            className="h-7 text-sm flex-1"
            autoFocus
          />
          <Button size="sm" onClick={handleRename} disabled={isPending} className="h-7 px-2 text-xs">
            確認
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setValue(name); setEditing(false) }} className="h-7 px-2 text-xs">
            取消
          </Button>
        </>
      ) : (
        <>
          <span className={`flex-1 text-sm ${indent ? 'text-muted-foreground' : 'font-medium'}`}>
            {indent ? '· ' : ''}{name}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 px-2 text-xs">
            編輯
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={isPending}
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
          >
            刪除
          </Button>
        </>
      )}
    </div>
  )
}

// ─── Add row ─────────────────────────────────────────────────────────────────

function AddRow({
  parentId,
  placeholder,
  onAdded,
}: {
  parentId?: string
  placeholder: string
  onAdded: () => void
}) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!value.trim()) return
    startTransition(async () => {
      const result = await createCategory(value.trim(), parentId)
      if (result.error) toast.error(result.error)
      else { toast.success('已新增'); setValue(''); setShow(false); onAdded() }
    })
  }

  if (!show) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShow(true)}
        className={`h-7 text-xs text-muted-foreground ${parentId ? 'ml-6' : ''}`}
      >
        + {placeholder}
      </Button>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${parentId ? 'pl-6' : ''}`}>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAdd()
          if (e.key === 'Escape') { setValue(''); setShow(false) }
        }}
        placeholder={placeholder}
        className="h-7 text-sm flex-1"
        autoFocus
      />
      <Button size="sm" onClick={handleAdd} disabled={isPending || !value.trim()} className="h-7 px-2 text-xs">
        新增
      </Button>
      <Button size="sm" variant="ghost" onClick={() => { setValue(''); setShow(false) }} className="h-7 px-2 text-xs">
        取消
      </Button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CategoryManager({
  initialCategories,
}: {
  initialCategories: Category[]
}) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  function refresh() {
    startTransition(() => {})
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        管理類別
      </Button>

      <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>類別管理</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-2">
            {initialCategories.map((cat) => (
              <div key={cat.id} className="flex flex-col gap-1 border rounded-lg p-3">
                <CategoryRow id={cat.id} name={cat.name} onDelete={refresh} />
                {cat.subcategories.map((sub) => (
                  <CategoryRow
                    key={sub.id}
                    id={sub.id}
                    name={sub.name}
                    indent
                    onDelete={refresh}
                  />
                ))}
                <AddRow parentId={cat.id} placeholder="新增子類別" onAdded={refresh} />
              </div>
            ))}
            <AddRow placeholder="新增類別" onAdded={refresh} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
