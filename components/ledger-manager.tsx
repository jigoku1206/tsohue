'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Settings, Plus, ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  getLedgerMembers,
  getAllUsers,
  createLedger,
  updateLedger,
  deleteLedger,
  setLedgerMembers,
  type Ledger,
  type LedgerMember,
  type UserProfile,
} from '@/app/actions/ledgers'
import { CURRENCIES, type CurrencyCode } from '@/lib/currencies'
import { toast } from 'sonner'

type Panel = 'list' | 'settings'

export function LedgerManager({
  ledgers: initialLedgers,
  currentLedgerId,
  currentUserId,
}: {
  ledgers: Ledger[]
  currentLedgerId: string
  currentUserId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>('list')
  const [activeLedger, setActiveLedger] = useState<Ledger | null>(null)

  // Settings state
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [currentMembers, setCurrentMembers] = useState<LedgerMember[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [savingMembers, setSavingMembers] = useState(false)
  const [renamingName, setRenamingName] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>('TWD')

  // Create state
  const [newLedgerName, setNewLedgerName] = useState('')
  const [creatingLedger, setCreatingLedger] = useState(false)

  const currentLedger = initialLedgers.find((l) => l.id === currentLedgerId)

  function closeDialog() {
    setOpen(false)
    setPanel('list')
    setActiveLedger(null)
    setAllUsers([])
    setCurrentMembers([])
    setSelectedIds(new Set())
  }

  function switchLedger(id: string) {
    router.push(`/dashboard?ledger=${id}`)
    closeDialog()
  }

  async function openSettings(ledger: Ledger) {
    setActiveLedger(ledger)
    setRenamingName(ledger.name)
    setDefaultCurrency((ledger.default_currency as CurrencyCode) ?? 'TWD')
    setPanel('settings')
    setLoadingSettings(true)

    const [users, members] = await Promise.all([
      getAllUsers(),
      getLedgerMembers(ledger.id),
    ])

    setAllUsers(users)
    setCurrentMembers(members)
    setSelectedIds(new Set(members.map((m) => m.user_id)))
    setLoadingSettings(false)
  }

  function toggleUser(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function handleCreateLedger() {
    if (!newLedgerName.trim()) return
    setCreatingLedger(true)
    const result = await createLedger(newLedgerName.trim())
    setCreatingLedger(false)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('帳本已建立')
      setNewLedgerName('')
      router.refresh()
      switchLedger(result.id)
    }
  }

  async function handleSaveSettings() {
    if (!activeLedger || !renamingName.trim()) return
    const result = await updateLedger(activeLedger.id, renamingName.trim(), defaultCurrency)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('已儲存設定')
      router.refresh()
      closeDialog()
    }
  }

  async function handleSaveMembers() {
    if (!activeLedger) return
    setSavingMembers(true)
    const result = await setLedgerMembers(activeLedger.id, Array.from(selectedIds))
    setSavingMembers(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('成員已更新')
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!activeLedger) return
    if (!confirm(`確定要刪除「${activeLedger.name}」帳本？帳本內所有消費記錄也會一併刪除。`)) return
    const result = await deleteLedger(activeLedger.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('帳本已刪除')
      if (activeLedger.id === currentLedgerId) router.push('/dashboard')
      else router.refresh()
      closeDialog()
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 font-medium max-w-[140px]"
      >
        <BookOpen className="h-4 w-4 shrink-0" />
        <span className="truncate">{currentLedger?.name ?? '帳本'}</span>
        <span className="text-muted-foreground text-[10px] shrink-0">▼</span>
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {panel === 'list' ? (
            <>
              <DialogHeader>
                <DialogTitle>帳本管理</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-2 mt-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">切換帳本</p>
                {initialLedgers.map((ledger) => {
                  const isActive = ledger.id === currentLedgerId
                  const isOwned = ledger.owner_id === currentUserId
                  return (
                    <div
                      key={ledger.id}
                      className={[
                        'flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors',
                        isActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                      ].join(' ')}
                    >
                      <button
                        className="flex items-center gap-2 flex-1 text-left"
                        onClick={() => switchLedger(ledger.id)}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm">{ledger.name}</span>
                            {ledger.is_public && (
                              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                公用
                              </span>
                            )}
                            {!ledger.is_public && !isOwned && (
                              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                共享
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <span className="text-xs text-primary">目前使用中</span>
                          )}
                        </div>
                      </button>
                      {isOwned && !ledger.is_public && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 ml-1"
                          onClick={(e) => { e.stopPropagation(); openSettings(ledger) }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">新增私人帳本</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="帳本名稱"
                    value={newLedgerName}
                    onChange={(e) => setNewLedgerName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateLedger() }}
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateLedger}
                    disabled={!newLedgerName.trim() || creatingLedger}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setPanel('list'); setActiveLedger(null) }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <DialogTitle>帳本設定</DialogTitle>
                </div>
              </DialogHeader>

              <div className="flex flex-col gap-5 mt-2">
                {/* Name + Currency */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm font-medium">帳本名稱</p>
                    <Input
                      value={renamingName}
                      onChange={(e) => setRenamingName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm font-medium">預設幣別</p>
                    <Select value={defaultCurrency} onValueChange={(v) => setDefaultCurrency(v as CurrencyCode)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.label}（{c.code}）
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">新增消費記錄時預設使用此幣別</p>
                  </div>
                  <Button size="sm" onClick={handleSaveSettings} disabled={!renamingName.trim()}>
                    儲存設定
                  </Button>
                </div>

                {/* Members checklist */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">分享給成員</p>
                  {loadingSettings ? (
                    <p className="text-sm text-muted-foreground py-2">載入使用者清單…</p>
                  ) : allUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">目前沒有其他使用者</p>
                  ) : (
                    <>
                      <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                        {allUsers.map((u) => {
                          const checked = selectedIds.has(u.id)
                          return (
                            <li key={u.id}>
                              <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleUser(u.id)}
                                  className="h-4 w-4 rounded"
                                />
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="text-sm font-medium">{u.nickname}</span>
                                  {u.email && (
                                    <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                                  )}
                                </div>
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                      <Button
                        onClick={handleSaveMembers}
                        disabled={savingMembers}
                        size="sm"
                      >
                        {savingMembers ? '儲存中…' : '儲存成員設定'}
                      </Button>
                    </>
                  )}
                </div>

                {/* Delete */}
                <div className="pt-2 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    刪除帳本
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
