'use client'

import { useActionState, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateProfile } from '@/app/actions/profile'
import { changePassword } from '@/app/actions/auth'
import { setRegistrationEnabled } from '@/app/actions/settings'
import { toast } from 'sonner'

export function ProfileDialog({
  email,
  nickname: initialNickname,
  isAdmin = false,
  registrationEnabled: initialRegistrationEnabled = true,
}: {
  email: string
  nickname: string
  isAdmin?: boolean
  registrationEnabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [regEnabled, setRegEnabled] = useState(initialRegistrationEnabled)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [isPendingReg, startRegTransition] = useTransition()
  const router = useRouter()

  const [passwordState, passwordAction, isPendingPassword] = useActionState(changePassword, null)

  async function handleAction(
    prevState: { error: string } | null,
    formData: FormData
  ) {
    const result = await updateProfile(prevState, formData)
    if (!result) {
      toast.success('個人資料已更新')
      setOpen(false)
    }
    return result
  }

  const [state, action, isPending] = useActionState(handleAction, null)

  function handleRegToggle() {
    const newVal = !regEnabled
    setRegEnabled(newVal)
    startRegTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('registration_enabled', String(newVal))
        await setRegistrationEnabled(null, formData)
        router.refresh()
        toast.success(newVal ? '已開放註冊' : '已關閉註冊')
      } catch {
        setRegEnabled(!newVal) // revert optimistic update
        toast.error('更新失敗，請稍後再試')
      }
    })
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="個人資料">
        <UserCircle className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>個人資料</DialogTitle>
          </DialogHeader>
          <form action={action} className="flex flex-col gap-4 mt-2">
            {state?.error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {state.error}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>電子郵件</Label>
              <Input value={email} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nickname">暱稱</Label>
              <Input
                id="nickname"
                name="nickname"
                required
                defaultValue={initialNickname}
                placeholder="你的暱稱"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? '儲存中…' : '儲存'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
            </div>
          </form>

          {/* ── Change password ── */}
          <div className="border-t pt-4 flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">更改密碼</p>
            {!showPasswordForm ? (
              <Button type="button" variant="outline" onClick={() => setShowPasswordForm(true)}>
                更改密碼
              </Button>
            ) : (
              <form action={passwordAction} className="flex flex-col gap-3">
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  ⚠ 更改密碼後將自動登出，所有裝置上的登入狀態也將失效，需以新密碼重新登入。
                </div>
                {passwordState?.error && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {passwordState.error}
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">新密碼</Label>
                  <Input id="password" name="password" type="password" required minLength={6} placeholder="至少 6 個字元" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirm">確認新密碼</Label>
                  <Input id="confirm" name="confirm" type="password" required minLength={6} placeholder="再輸入一次" />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="destructive" disabled={isPendingPassword} className="flex-1">
                    {isPendingPassword ? '更新中…' : '確認更改'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowPasswordForm(false)}>
                    取消
                  </Button>
                </div>
              </form>
            )}
          </div>

          {isAdmin && (
            <div className="border-t pt-4 flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">管理員設定</p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <Label>開放註冊</Label>
                  <p className="text-sm text-muted-foreground">
                    {regEnabled ? '目前開放新用戶註冊' : '目前不開放新用戶註冊'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={regEnabled ? 'destructive' : 'default'}
                  size="sm"
                  disabled={isPendingReg}
                  onClick={handleRegToggle}
                >
                  {isPendingReg ? '更新中…' : regEnabled ? '關閉註冊' : '開放註冊'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
