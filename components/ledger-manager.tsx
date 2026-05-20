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
  type Ledger,
  type LedgerMember,
} from '@/app/actions/ledgers'
import { useActions } from '@/lib/actions-context'
import { CURRENCIES, type CurrencyCode } from '@/lib/currencies'
import { toast } from 'sonner'

type Panel = 'list' | 'settings'

export function LedgerManager({
  ledgers: initialLedgers,
  currentLedgerId,
  currentUserId,
  onSwitchLedger,
}: {
  ledgers: Ledger[]
  currentLedgerId: string
  currentUserId: string
  onSwitchLedger?: (id: string) => void
}) {
  const {
    getLedgerMembers,
    createLedger,
    updateLedger,
    deleteLedger,
    addLedgerMemberByEmail,
    removeLedgerMember,
  } = useActions()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>('list')
  const [activeLedger, setActiveLedger] = useState<Ledger | null>(null)

  // Settings state
  const [currentMembers, setCurrentMembers] = useState<LedgerMember[]>([])
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [savingMember, setSavingMember] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [renamingName, setRenamingName] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>('TWD')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Create state
  const [newLedgerName, setNewLedgerName] = useState('')
  const [creatingLedger, setCreatingLedger] = useState(false)

  const currentLedger = initialLedgers.find((l) => l.id === currentLedgerId)

  function closeDialog() {
    setOpen(false)
    setPanel('list')
    setActiveLedger(null)
    setCurrentMembers([])
    setInviteEmail('')
  }

  function switchLedger(id: string) {
    if (onSwitchLedger) {
      onSwitchLedger(id)
    } else {
      router.push(`/dashboard?ledger=${id}`)
    }
    closeDialog()
  }

  async function openSettings(ledger: Ledger) {
    setActiveLedger(ledger)
    setRenamingName(ledger.name)
    setDefaultCurrency((ledger.default_currency as CurrencyCode) ?? 'TWD')
    setPanel('settings')
    setLoadingSettings(true)

    const members = await getLedgerMembers(ledger.id)

    setCurrentMembers(members)
    setLoadingSettings(false)
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

  async function handleAddMember() {
    if (!activeLedger || !inviteEmail.trim()) return
    setSavingMember(true)
    const result = await addLedgerMemberByEmail(activeLedger.id, inviteEmail.trim())
    setSavingMember(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('成員已加入')
      setInviteEmail('')
      setCurrentMembers(await getLedgerMembers(activeLedger.id))
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!activeLedger) return
    setSavingMember(true)
    const result = await removeLedgerMember(activeLedger.id, userId)
    setSavingMember(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('成員已移除')
      setCurrentMembers((members) => members.filter((m) => m.user_id !== userId))
    }
  }

  async function handleDelete() {
    if (!activeLedger) return
    setDeleteConfirm(true)
  }

  async function handleConfirmedDelete() {
    if (!activeLedger) return
    setDeleteConfirm(false)
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
        className="flex h-9 max-w-[8.5rem] items-center gap-1.5 px-2 font-medium sm:h-8 sm:max-w-[140px] sm:px-3 max-[380px]:max-w-10"
        aria-label={`切換帳本：${currentLedger?.name ?? '帳本'}`}
        title={currentLedger?.name ?? '帳本'}
      >
        <BookOpen className="h-4 w-4 shrink-0" />
        <span className="truncate max-[380px]:sr-only">{currentLedger?.name ?? '帳本'}</span>
        <span className="text-muted-foreground text-[10px] shrink-0 max-[380px]:hidden">▼</span>
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true) }}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-3 sm:max-h-[85vh] sm:p-4">
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

              <div className="flex flex-col gap-4 mt-2 sm:gap-5">
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

                {/* Members */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">分享給成員</p>
                  {loadingSettings ? (
                    <p className="text-sm text-muted-foreground py-2">載入成員清單…</p>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="member@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddMember() }}
                        />
                        <Button
                          size="sm"
                          onClick={handleAddMember}
                          disabled={!inviteEmail.trim() || savingMember}
                          className="shrink-0"
                        >
                          加入
                        </Button>
                      </div>
                      {currentMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">尚未分享給其他成員</p>
                      ) : (
                        <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                          {currentMembers.map((member) => (
                            <li
                              key={member.user_id}
                              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border"
                            >
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-sm font-medium">{member.nickname}</span>
                                {member.email && (
                                  <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => handleRemoveMember(member.user_id)}
                                disabled={savingMember}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
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

      {/* Delete ledger confirmation dialog */}
      {deleteConfirm && activeLedger && (
        <Dialog open={deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(false) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>確認刪除帳本</DialogTitle>
            </DialogHeader>
            <div className="bg-muted rounded-xl px-4 py-4 my-1">
              <p className="font-semibold">「{activeLedger.name}」</p>
              <p className="text-sm text-destructive mt-1">帳本內所有消費記錄也會一併永久刪除，此操作無法復原。</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(false)}>取消</Button>
              <Button variant="destructive" className="flex-1 gap-1.5" onClick={handleConfirmedDelete}>
                <Trash2 className="h-4 w-4" />確認刪除
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
