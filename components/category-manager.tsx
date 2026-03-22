'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ArrowUpAZ, ArrowDownAZ } from 'lucide-react'
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
  updateCategoryPositions,
  type Category,
} from '@/app/actions/categories'
import { toast } from 'sonner'

// ─── Sortable wrapper ────────────────────────────────────────────────────────

function SortableItem({ id, children }: { id: string; children: (drag: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const handle = (
    <button
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none p-0.5 text-muted-foreground hover:text-foreground"
      tabIndex={-1}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )
  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  )
}

// ─── Inline editable row ────────────────────────────────────────────────────

function CategoryRow({
  id,
  name,
  indent = false,
  dragHandle,
  onDelete,
}: {
  id: string
  name: string
  indent?: boolean
  dragHandle?: React.ReactNode
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
    const label = indent ? `子類別「${name}」` : `類別「${name}」及其所有子類別`
    if (!confirm(`確定要刪除${label}？`)) return
    startTransition(async () => {
      const result = await deleteCategory(id)
      if (result.error) toast.error(result.error)
      else { toast.success('已刪除'); onDelete() }
    })
  }

  return (
    <div className={`flex items-center gap-1.5 ${indent ? 'pl-5' : ''}`}>
      {dragHandle}
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
          <Button size="sm" onClick={handleRename} disabled={isPending} className="h-7 px-2 text-xs">確認</Button>
          <Button size="sm" variant="ghost" onClick={() => { setValue(name); setEditing(false) }} className="h-7 px-2 text-xs">取消</Button>
        </>
      ) : (
        <>
          <span className={`flex-1 text-sm ${indent ? 'text-muted-foreground' : 'font-medium'}`}>
            {indent ? '· ' : ''}{name}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="h-7 px-2 text-xs">編輯</Button>
          <Button
            size="sm" variant="ghost" onClick={handleDelete} disabled={isPending}
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

function AddRow({ parentId, placeholder, onAdded }: { parentId?: string; placeholder: string; onAdded: () => void }) {
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
      <Button variant="ghost" size="sm" onClick={() => setShow(true)}
        className={`h-7 text-xs text-muted-foreground ${parentId ? 'ml-5' : ''}`}>
        + {placeholder}
      </Button>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${parentId ? 'pl-5' : ''}`}>
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
      <Button size="sm" onClick={handleAdd} disabled={isPending || !value.trim()} className="h-7 px-2 text-xs">新增</Button>
      <Button size="sm" variant="ghost" onClick={() => { setValue(''); setShow(false) }} className="h-7 px-2 text-xs">取消</Button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [open, setOpen] = useState(false)
  const [cats, setCats] = useState<Category[]>(initialCategories)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  function refresh() { startTransition(() => {}) }

  // ── Top-level drag end ──
  function handleParentDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = cats.findIndex((c) => c.id === active.id)
    const newIdx = cats.findIndex((c) => c.id === over.id)
    const next = arrayMove(cats, oldIdx, newIdx)
    setCats(next)
    savePositions(next.map((c, i) => ({ id: c.id, position: i })))
  }

  // ── Subcategory drag end ──
  function handleSubDragEnd(parentId: string, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const parent = cats.find((c) => c.id === parentId)
    if (!parent) return
    const oldIdx = parent.subcategories.findIndex((s) => s.id === active.id)
    const newIdx = parent.subcategories.findIndex((s) => s.id === over.id)
    const newSubs = arrayMove(parent.subcategories, oldIdx, newIdx)
    setCats((prev) => prev.map((c) =>
      c.id === parentId ? { ...c, subcategories: newSubs } : c
    ))
    savePositions(newSubs.map((s, i) => ({ id: s.id, position: i })))
  }

  function savePositions(updates: { id: string; position: number }[]) {
    startTransition(async () => {
      const result = await updateCategoryPositions(updates)
      if (result.error) toast.error(result.error)
    })
  }

  // ── Quick sort (top-level) ──
  function quickSort(asc: boolean) {
    const next = [...cats].sort((a, b) =>
      asc ? a.name.localeCompare(b.name, 'zh-TW') : b.name.localeCompare(a.name, 'zh-TW')
    )
    setCats(next)
    savePositions(next.map((c, i) => ({ id: c.id, position: i })))
    toast.success(asc ? '已依 A→Z 排序' : '已依 Z→A 排序')
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>管理類別</Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCats(initialCategories) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>類別管理</DialogTitle>
          </DialogHeader>

          {/* Quick sort toolbar */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground">快速排序：</span>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => quickSort(true)}>
              <ArrowUpAZ className="h-3.5 w-3.5" />A→Z
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => quickSort(false)}>
              <ArrowDownAZ className="h-3.5 w-3.5" />Z→A
            </Button>
          </div>

          {/* Category list with top-level drag */}
          <div className="flex flex-col gap-3 mt-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleParentDragEnd}>
              <SortableContext items={cats.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                {cats.map((cat) => (
                  <SortableItem key={cat.id} id={cat.id}>
                    {(parentHandle) => (
                      <div className="flex flex-col gap-1 border rounded-lg p-3">
                        <CategoryRow
                          id={cat.id} name={cat.name}
                          dragHandle={parentHandle}
                          onDelete={() => {
                            setCats((prev) => prev.filter((c) => c.id !== cat.id))
                            refresh()
                          }}
                        />

                        {/* Subcategory drag */}
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleSubDragEnd(cat.id, e)}
                        >
                          <SortableContext items={cat.subcategories.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                            {cat.subcategories.map((sub) => (
                              <SortableItem key={sub.id} id={sub.id}>
                                {(subHandle) => (
                                  <CategoryRow
                                    id={sub.id} name={sub.name} indent
                                    dragHandle={subHandle}
                                    onDelete={() => {
                                      setCats((prev) => prev.map((c) =>
                                        c.id === cat.id
                                          ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== sub.id) }
                                          : c
                                      ))
                                      refresh()
                                    }}
                                  />
                                )}
                              </SortableItem>
                            ))}
                          </SortableContext>
                        </DndContext>

                        <AddRow
                          parentId={cat.id}
                          placeholder="新增子類別"
                          onAdded={() => { refresh(); setOpen(false); setTimeout(() => setOpen(true), 50) }}
                        />
                      </div>
                    )}
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>

            <AddRow
              placeholder="新增類別"
              onAdded={() => { refresh(); setOpen(false); setTimeout(() => setOpen(true), 50) }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
